import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateLocationDto } from './dto/create-location.dto.js';
import type { UpdateLocationDto } from './dto/update-location.dto.js';

export interface LocationNode {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  isPermanentDefault: boolean;
  qrToken: string;
  children: LocationNode[];
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateLocationDto) {
    if (dto.parentId) {
      await this.assertOwnedLocation(ownerId, dto.parentId);
    }

    return this.prisma.location.create({
      data: { ownerId, name: dto.name, icon: dto.icon ?? null, parentId: dto.parentId ?? null },
    });
  }

  async findTree(ownerId: string): Promise<LocationNode[]> {
    const locations = await this.prisma.location.findMany({
      where: { ownerId },
      orderBy: { name: 'asc' },
    });

    const nodesById = new Map<string, LocationNode>(
      locations.map((location) => [
        location.id,
        {
          id: location.id,
          name: location.name,
          icon: location.icon,
          parentId: location.parentId,
          isPermanentDefault: location.isPermanentDefault,
          qrToken: location.qrToken,
          children: [],
        },
      ]),
    );

    const roots: LocationNode[] = [];
    for (const node of nodesById.values()) {
      if (node.parentId && nodesById.has(node.parentId)) {
        nodesById.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findOne(ownerId: string, id: string) {
    return this.assertOwnedLocation(ownerId, id);
  }

  async update(ownerId: string, id: string, dto: UpdateLocationDto) {
    const location = await this.assertOwnedLocation(ownerId, id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Una ubicación no puede ser su propia ubicación padre');
      }
      await this.assertOwnedLocation(ownerId, dto.parentId);

      const descendantIds = await this.collectDescendantIds(ownerId, id);
      if (descendantIds.has(dto.parentId)) {
        throw new BadRequestException(
          'No se puede mover una ubicación dentro de una de sus propias sub-ubicaciones',
        );
      }
    }

    return this.prisma.location.update({
      where: { id: location.id },
      data: {
        name: dto.name,
        icon: dto.icon === undefined ? undefined : dto.icon,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    const location = await this.assertOwnedLocation(ownerId, id);

    const [childrenCount, itemsCount] = await Promise.all([
      this.prisma.location.count({ where: { parentId: id } }),
      this.prisma.item.count({
        where: { OR: [{ currentLocationId: id }, { permanentLocationId: id }] },
      }),
    ]);

    if (childrenCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar una ubicación que tiene sub-ubicaciones. Muévelas o elimínalas primero.',
      );
    }
    if (itemsCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar una ubicación con objetos asignados. Reubica los objetos primero.',
      );
    }
    if (location.isPermanentDefault) {
      throw new BadRequestException('La ubicación permanente por default no se puede eliminar');
    }

    await this.prisma.location.delete({ where: { id } });
  }

  async getQrImage(ownerId: string, id: string) {
    const location = await this.assertOwnedLocation(ownerId, id);
    // width alto + margen: a 132px (default) el QR es casi imposible de leer
    // ya impreso o a distancia normal de cámara.
    const dataUrl = await QRCode.toDataURL(location.qrToken, {
      width: 600,
      margin: 3,
      errorCorrectionLevel: 'M',
    });
    return { qrToken: location.qrToken, qrImageDataUrl: dataUrl };
  }

  // El owner de la ubicación siempre puede ver el contenido al escanear. Un
  // miembro de un grupo familiar también, si tiene acceso de solo lectura
  // (LocationMember, heredado de una colección compartida en común).
  async resolveByToken(token: string, requestingUserId: string) {
    const location = await this.prisma.location.findUnique({ where: { qrToken: token } });
    if (!location) {
      throw new NotFoundException('Código QR no reconocido');
    }
    if (location.ownerId !== requestingUserId) {
      const member = await this.prisma.locationMember.findUnique({
        where: { locationId_userId: { locationId: location.id, userId: requestingUserId } },
      });
      if (!member) {
        throw new ForbiddenException('No tienes acceso a esta ubicación');
      }
    }

    const descendantIds = await this.collectDescendantIds(location.ownerId, location.id);
    const locationIds = [location.id, ...descendantIds];

    // Los vendidos conservan su ubicación en el registro inmutable, pero ya no están
    // físicamente ahí. Se incluye la ubicación actual para que la app marque los
    // objetos que pertenecen aquí pero andan fuera (p. ej. por una temporada).
    const items = await this.prisma.item.findMany({
      where: {
        ownerId: location.ownerId,
        status: { not: 'SOLD' },
        OR: [{ currentLocationId: { in: locationIds } }, { permanentLocationId: { in: locationIds } }],
      },
      include: {
        photos: { orderBy: { order: 'asc' }, take: 1 },
        currentLocation: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { location, items };
  }

  private async assertOwnedLocation(ownerId: string, id: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location || location.ownerId !== ownerId) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    return location;
  }

  // Tras vincular/desvincular un objeto de una colección, o cambiar su
  // ubicación (uno por uno o en bloque desde CollectionLocationService),
  // otorga/revoca accesos de solo lectura (LocationMember con source
  // INHERITED_FROM_COLLECTION) a los demás miembros de cada colección
  // compartida a la que el objeto pertenezca, sobre su ubicación actual y
  // permanente — así el grupo familiar puede ver dónde está sin ser su dueño.
  // Vive aquí (no en ItemsService) porque CollectionsModule ya depende de
  // LocationsModule y ItemsModule depende de CollectionsModule: ponerlo en
  // ItemsService crearía una dependencia circular con CollectionLocationService.
  async syncInheritedLocationAccess(itemId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: {
        ownerId: true,
        currentLocationId: true,
        permanentLocationId: true,
        collections: { select: { collection: { select: { members: { select: { userId: true } } } } } },
      },
    });
    if (!item) return;

    const memberIds = new Set<string>();
    for (const { collection } of item.collections) {
      if (collection.members.length <= 1) continue;
      for (const member of collection.members) {
        if (member.userId !== item.ownerId) memberIds.add(member.userId);
      }
    }

    const locationIds = [...new Set([item.currentLocationId, item.permanentLocationId].filter((v): v is string => v != null))];

    if (memberIds.size > 0 && locationIds.length > 0) {
      await Promise.all(
        locationIds.flatMap((locationId) =>
          [...memberIds].map((userId) =>
            this.prisma.locationMember.upsert({
              where: { locationId_userId: { locationId, userId } },
              create: { locationId, userId, role: 'VIEWER', source: 'INHERITED_FROM_COLLECTION' },
              update: {},
            }),
          ),
        ),
      );
    }

    await this.revokeStaleInheritedLocationAccess(item.ownerId);
  }

  // Recorre las ubicaciones del owner que tengan algún acceso heredado y
  // quita los que ya no correspondan: ningún objeto suyo en esa ubicación
  // sigue vinculado a una colección compartida con ese miembro.
  private async revokeStaleInheritedLocationAccess(ownerId: string) {
    const locations = await this.prisma.location.findMany({
      where: { ownerId, members: { some: { source: 'INHERITED_FROM_COLLECTION' } } },
      select: {
        id: true,
        members: { where: { source: 'INHERITED_FROM_COLLECTION' }, select: { userId: true } },
        itemsAsCurrent: {
          select: { collections: { select: { collection: { select: { members: { select: { userId: true } } } } } } },
        },
        itemsAsPermanent: {
          select: { collections: { select: { collection: { select: { members: { select: { userId: true } } } } } } },
        },
      },
    });

    for (const location of locations) {
      const stillVisibleTo = new Set<string>();
      for (const item of [...location.itemsAsCurrent, ...location.itemsAsPermanent]) {
        for (const { collection } of item.collections) {
          if (collection.members.length <= 1) continue;
          for (const member of collection.members) {
            if (member.userId !== ownerId) stillVisibleTo.add(member.userId);
          }
        }
      }
      const toRevoke = location.members.map((m) => m.userId).filter((userId) => !stillVisibleTo.has(userId));
      if (toRevoke.length) {
        await this.prisma.locationMember.deleteMany({
          where: { locationId: location.id, source: 'INHERITED_FROM_COLLECTION', userId: { in: toRevoke } },
        });
      }
    }
  }

  private async collectDescendantIds(ownerId: string, rootId: string): Promise<Set<string>> {
    const all = await this.prisma.location.findMany({
      where: { ownerId },
      select: { id: true, parentId: true },
    });
    const childrenByParent = new Map<string, string[]>();
    for (const loc of all) {
      if (!loc.parentId) continue;
      const siblings = childrenByParent.get(loc.parentId) ?? [];
      siblings.push(loc.id);
      childrenByParent.set(loc.parentId, siblings);
    }

    const result = new Set<string>();
    const stack = [...(childrenByParent.get(rootId) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (result.has(current)) continue;
      result.add(current);
      stack.push(...(childrenByParent.get(current) ?? []));
    }
    return result;
  }
}
