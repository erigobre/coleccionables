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
  // Presente solo en ubicaciones ajenas vistas por LocationMember (heredado de
  // una colección compartida, o compartido a mano — ver shareLocation).
  isShared?: boolean;
  sharedByUserId?: string;
  sharedByName?: string;
  myRole?: 'VIEWER' | 'EDITOR';
  children: LocationNode[];
}

type MinLocationRole = 'VIEWER' | 'EDITOR';

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

  // Incluye, además del árbol propio, las ubicaciones ajenas donde el usuario
  // tiene LocationMember (heredado de una colección compartida, o compartido
  // a mano con shareLocation) — sin esto el picker de ubicación de un editor
  // nunca podría mostrar/elegir una ubicación ya compartida con el dueño real.
  async findTree(ownerId: string): Promise<LocationNode[]> {
    const [locations, sharedMemberships] = await Promise.all([
      this.prisma.location.findMany({ where: { ownerId }, orderBy: { name: 'asc' } }),
      this.prisma.locationMember.findMany({
        where: { userId: ownerId },
        include: { location: true },
      }),
    ]);

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

    if (sharedMemberships.length) {
      const ownerIds = [...new Set(sharedMemberships.map((m) => m.location.ownerId))];
      const owners = await this.prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, username: true },
      });
      const ownerById = new Map(owners.map((o) => [o.id, o]));
      for (const membership of sharedMemberships) {
        const owner = ownerById.get(membership.location.ownerId);
        roots.push({
          id: membership.location.id,
          name: membership.location.name,
          icon: membership.location.icon,
          parentId: null,
          isPermanentDefault: false,
          qrToken: membership.location.qrToken,
          isShared: true,
          sharedByUserId: membership.location.ownerId,
          sharedByName: owner?.username ? `@${owner.username}` : owner?.name ?? 'otro usuario',
          myRole: membership.role as MinLocationRole,
          children: [],
        });
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
    if (!(await this.hasLocationAccess(requestingUserId, location, 'VIEWER'))) {
      throw new ForbiddenException('No tienes acceso a esta ubicación');
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

  private static readonly ROLE_RANK: Record<string, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

  private async hasLocationAccess(
    userId: string,
    location: { id: string; ownerId: string },
    minRole: MinLocationRole,
  ): Promise<boolean> {
    if (location.ownerId === userId) return true;
    const member = await this.prisma.locationMember.findUnique({
      where: { locationId_userId: { locationId: location.id, userId } },
    });
    return !!member && LocationsService.ROLE_RANK[member.role] >= LocationsService.ROLE_RANK[minRole];
  }

  // Generaliza el chequeo ad-hoc que antes vivía solo en resolveByToken: el
  // dueño real siempre pasa; si no, exige un LocationMember con rol igual o
  // por encima de minRole. Usado por ItemsService.changeLocation (un editor
  // solo necesita poder acceder él mismo a la ubicación destino) y por el
  // picker de ubicación de la app para validar antes de elegir.
  async assertAccessible(userId: string, locationId: string, minRole: MinLocationRole = 'VIEWER') {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Ubicación no encontrada');
    if (!(await this.hasLocationAccess(userId, location, minRole))) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    return location;
  }

  // Compartir manual de una ubicación propia (caso "vivimos juntos"): solo el
  // dueño, y solo hacia alguien con quien ya comparte al menos una colección
  // (no es un mecanismo para contactar a cualquier usuario del sistema).
  // VIEWER: ve la ubicación y su contenido. EDITOR: además puede mover ahí sus
  // propios objetos, estén o no en una colección compartida con el dueño — el
  // acceso al objeto y el acceso a la ubicación son chequeos independientes.
  async shareLocation(ownerId: string, locationId: string, targetUserId: string, role: MinLocationRole) {
    await this.assertOwnedLocation(ownerId, locationId);
    if (targetUserId === ownerId) {
      throw new BadRequestException('No puedes compartir una ubicación contigo mismo');
    }
    const sharesCollection = await this.prisma.collectionMember.count({
      where: { userId: ownerId, collection: { members: { some: { userId: targetUserId } } } },
    });
    if (sharesCollection === 0) {
      throw new BadRequestException('Solo puedes compartir ubicaciones con alguien con quien ya compartes una colección');
    }
    return this.prisma.locationMember.upsert({
      where: { locationId_userId: { locationId, userId: targetUserId } },
      create: { locationId, userId: targetUserId, role, source: 'MANUAL' },
      update: { role, source: 'MANUAL' },
    });
  }

  async revokeLocationShare(ownerId: string, locationId: string, targetUserId: string) {
    await this.assertOwnedLocation(ownerId, locationId);
    await this.prisma.locationMember.deleteMany({
      where: { locationId, userId: targetUserId, source: 'MANUAL' },
    });
  }

  async listLocationShares(ownerId: string, locationId: string) {
    await this.assertOwnedLocation(ownerId, locationId);
    return this.prisma.locationMember.findMany({
      where: { locationId, source: 'MANUAL' },
      include: { user: { select: { id: true, name: true, username: true } } },
    });
  }

  // Candidatos para compartir manualmente una ubicación: cualquiera con quien
  // ownerId ya comparte al menos una colección (misma regla que valida
  // shareLocation) — alimenta el picker de "Compartir con..." en la app.
  async listShareCandidates(ownerId: string) {
    const myCollectionIds = (
      await this.prisma.collectionMember.findMany({ where: { userId: ownerId }, select: { collectionId: true } })
    ).map((m) => m.collectionId);
    if (myCollectionIds.length === 0) return [];

    const members = await this.prisma.collectionMember.findMany({
      where: { collectionId: { in: myCollectionIds }, userId: { not: ownerId } },
      select: { user: { select: { id: true, name: true, username: true } } },
      distinct: ['userId'],
    });
    return members.map((m) => m.user);
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
        currentLocation: { select: { id: true, ownerId: true } },
        permanentLocation: { select: { id: true, ownerId: true } },
        collections: { select: { collection: { select: { members: { select: { userId: true } } } } } },
      },
    });
    if (!item) return;

    const sharedMemberIds = new Set<string>();
    for (const { collection } of item.collections) {
      if (collection.members.length <= 1) continue;
      for (const member of collection.members) {
        if (member.userId !== item.ownerId) sharedMemberIds.add(member.userId);
      }
    }

    const locations = [item.currentLocation, item.permanentLocation].filter(
      (l): l is { id: string; ownerId: string } => l != null,
    );
    const uniqueLocations = [...new Map(locations.map((l) => [l.id, l])).values()];

    // Antes se asumía location.ownerId === item.ownerId siempre (cierto
    // mientras solo el dueño podía mover objetos). Ahora un editor puede
    // mover el objeto a una ubicación suya: se excluye al dueño REAL de esa
    // ubicación (quien sea) del reparto, y se asegura que el dueño real del
    // objeto reciba acceso si no es ya el dueño de la ubicación.
    for (const location of uniqueLocations) {
      const grantees = new Set<string>([item.ownerId, ...sharedMemberIds]);
      grantees.delete(location.ownerId);
      if (grantees.size === 0) continue;
      await Promise.all(
        [...grantees].map((userId) =>
          this.prisma.locationMember.upsert({
            where: { locationId_userId: { locationId: location.id, userId } },
            create: { locationId: location.id, userId, role: 'VIEWER', source: 'INHERITED_FROM_COLLECTION' },
            update: {},
          }),
        ),
      );
    }

    await this.revokeStaleInheritedLocationAccess([item.ownerId, ...sharedMemberIds]);
  }

  // Recorre las ubicaciones de cualquiera de los "candidatos" (el dueño real
  // del objeto y sus compañeros de colección compartida) que tengan algún
  // acceso heredado, y quita los que ya no correspondan — ya sea porque
  // ningún objeto del dueño de esa ubicación sigue vinculado a una colección
  // compartida con ese miembro, o porque el dueño real de un objeto ya no
  // necesita ver una ubicación ajena donde ese objeto dejó de estar. No toca
  // accesos MANUAL (compartir manual de ubicación, ver shareLocation).
  private async revokeStaleInheritedLocationAccess(candidateOwnerIds: string[]) {
    if (candidateOwnerIds.length === 0) return;
    const locations = await this.prisma.location.findMany({
      where: { ownerId: { in: candidateOwnerIds }, members: { some: { source: 'INHERITED_FROM_COLLECTION' } } },
      select: {
        id: true,
        ownerId: true,
        members: { where: { source: 'INHERITED_FROM_COLLECTION' }, select: { userId: true } },
        itemsAsCurrent: {
          select: {
            ownerId: true,
            collections: { select: { collection: { select: { members: { select: { userId: true } } } } } },
          },
        },
        itemsAsPermanent: {
          select: {
            ownerId: true,
            collections: { select: { collection: { select: { members: { select: { userId: true } } } } } },
          },
        },
      },
    });

    for (const location of locations) {
      const stillVisibleTo = new Set<string>();
      for (const item of [...location.itemsAsCurrent, ...location.itemsAsPermanent]) {
        if (item.ownerId !== location.ownerId) stillVisibleTo.add(item.ownerId);
        for (const { collection } of item.collections) {
          if (collection.members.length <= 1) continue;
          for (const member of collection.members) {
            if (member.userId !== location.ownerId) stillVisibleTo.add(member.userId);
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
