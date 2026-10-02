import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Collection, SharedRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_COLLECTIONS } from './default-collections.js';
import type { CreateCollectionDto } from './dto/create-collection.dto.js';
import type { UpdateCollectionDto } from './dto/update-collection.dto.js';
import type { RemoveCollectionDto } from './dto/remove-collection.dto.js';

const SALE_COLLECTION_NAME = 'En Venta';
const SALE_COLLECTION_ICON = 'pricetag-outline';

// VIEWER no se usa hoy para colecciones (solo EDITOR/OWNER vía CollectionMember),
// pero se mantiene en el ranking por si se habilita más adelante.
const ROLE_RANK: Record<SharedRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaults(ownerId: string) {
    await this.prisma.collection.createMany({
      data: DEFAULT_COLLECTIONS.map((name) => ({ ownerId, name, isDefault: true })),
    });
  }

  async create(ownerId: string, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: { ownerId, name: dto.name, icon: dto.icon },
    });
  }

  // Orden por default: mayor cantidad de objetos, descendente (plan §5.2.4).
  // Las colecciones suspendidas no aparecen en la vista de Colecciones.
  // Incluye las colecciones propias y aquellas compartidas donde el usuario
  // es miembro (grupo familiar, ver CollectionMembersService).
  async findAllActive(userId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { status: 'ACTIVE', OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      include: { _count: { select: { itemLinks: true } } },
    });

    return collections
      .map((c) => ({ ...c, itemCount: c._count.itemLinks }))
      .sort((a, b) => b.itemCount - a.itemCount);
  }

  // "En Venta" (isSystem) no se administra desde aquí: no se edita, suspende ni borra.
  async findAllForManagement(userId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { isSystem: false, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      include: { _count: { select: { itemLinks: true } } },
    });
    return collections.map((c) => ({ ...c, itemCount: c._count.itemLinks }));
  }

  async findOne(ownerId: string, id: string) {
    return this.assertOwnedCollection(ownerId, id);
  }

  async update(ownerId: string, id: string, dto: UpdateCollectionDto) {
    await this.assertUserManageable(ownerId, id);
    return this.prisma.collection.update({
      where: { id },
      data: { name: dto.name, icon: dto.icon },
    });
  }

  async setSuspended(ownerId: string, id: string, suspended: boolean) {
    await this.assertUserManageable(ownerId, id);
    return this.prisma.collection.update({
      where: { id },
      data: { status: suspended ? 'SUSPENDED' : 'ACTIVE' },
    });
  }

  async remove(ownerId: string, id: string, dto: RemoveCollectionDto) {
    const collection = await this.assertUserManageable(ownerId, id);
    const itemCount = await this.prisma.itemCollection.count({ where: { collectionId: id } });

    if (itemCount > 0) {
      if (!dto.migrateToCollectionId) {
        throw new BadRequestException(
          'Esta colección tiene objetos. Indica a qué colección migrarlos antes de eliminarla.',
        );
      }
      if (dto.migrateToCollectionId === id) {
        throw new BadRequestException('La colección destino debe ser distinta a la que se elimina');
      }
      await this.assertCanAddItems(ownerId, dto.migrateToCollectionId);
      await this.migrateItems(id, dto.migrateToCollectionId);
    }

    await this.prisma.collection.delete({ where: { id: collection.id } });
  }

  // Usado por ItemsModule antes de vincular un objeto a una colección:
  // no se pueden agregar objetos nuevos a una colección suspendida (plan §5.2.5).
  // EDITOR (default al unirse a una colección compartida) ya puede agregar
  // sus propios objetos, no hace falta ser OWNER.
  async assertCanAddItems(userId: string, collectionId: string) {
    const collection = await this.assertCollectionRole(userId, collectionId, 'EDITOR');
    if (collection.isSystem) {
      throw new BadRequestException(`La colección "${collection.name}" la administra el sistema`);
    }
    if (collection.status === 'SUSPENDED') {
      throw new BadRequestException(
        `La colección "${collection.name}" está suspendida y no admite objetos nuevos`,
      );
    }
    return collection;
  }

  // Quitar un objeto de "En Venta" a mano no está permitido: se hace desactivando la venta.
  async assertCanRemoveItems(userId: string, collectionId: string) {
    const collection = await this.assertCollectionRole(userId, collectionId, 'EDITOR');
    if (collection.isSystem) {
      throw new BadRequestException(
        `Este objeto sale de "${collection.name}" al desactivar su venta o marcarlo como vendido`,
      );
    }
  }

  // "En Venta" se crea la primera vez que el usuario pone un objeto en venta y se
  // muestra (ACTIVE) mientras tenga al menos un objeto; si se queda vacía se oculta.
  async addToSaleCollection(ownerId: string, itemId: string) {
    let collection = await this.prisma.collection.findFirst({ where: { ownerId, isSystem: true } });
    if (!collection) {
      collection = await this.prisma.collection.create({
        data: { ownerId, name: SALE_COLLECTION_NAME, icon: SALE_COLLECTION_ICON, isSystem: true },
      });
    }
    await this.prisma.itemCollection.upsert({
      where: { itemId_collectionId: { itemId, collectionId: collection.id } },
      create: { itemId, collectionId: collection.id },
      update: {},
    });
    if (collection.status !== 'ACTIVE') {
      await this.prisma.collection.update({ where: { id: collection.id }, data: { status: 'ACTIVE' } });
    }
  }

  async removeFromSaleCollection(ownerId: string, itemId: string) {
    const collection = await this.prisma.collection.findFirst({ where: { ownerId, isSystem: true } });
    if (!collection) return;
    await this.prisma.itemCollection.deleteMany({ where: { itemId, collectionId: collection.id } });
    await this.syncSaleCollectionStatus(collection.id, collection.status);
  }

  // Tras borrar un objeto (el vínculo se va en cascada) hay que volver a evaluar si
  // "En Venta" sigue teniendo objetos.
  async refreshSaleCollectionStatus(ownerId: string) {
    const collection = await this.prisma.collection.findFirst({ where: { ownerId, isSystem: true } });
    if (collection) await this.syncSaleCollectionStatus(collection.id, collection.status);
  }

  private async syncSaleCollectionStatus(collectionId: string, currentStatus: 'ACTIVE' | 'SUSPENDED') {
    const remaining = await this.prisma.itemCollection.count({ where: { collectionId } });
    const status = remaining > 0 ? 'ACTIVE' : 'SUSPENDED';
    if (status !== currentStatus) {
      await this.prisma.collection.update({ where: { id: collectionId }, data: { status } });
    }
  }

  // Editar/suspender/eliminar la colección es exclusivo del OWNER, aunque
  // esté compartida con otros miembros (EDITOR/VIEWER no pueden).
  private async assertUserManageable(userId: string, id: string) {
    const collection = await this.assertCollectionRole(userId, id, 'OWNER');
    if (collection.isSystem) {
      throw new BadRequestException(`La colección "${collection.name}" la administra el sistema y no se puede modificar`);
    }
    return collection;
  }

  private async migrateItems(fromCollectionId: string, toCollectionId: string) {
    const links = await this.prisma.itemCollection.findMany({
      where: { collectionId: fromCollectionId },
      select: { itemId: true },
    });
    const existingInTarget = await this.prisma.itemCollection.findMany({
      where: { collectionId: toCollectionId, itemId: { in: links.map((l) => l.itemId) } },
      select: { itemId: true },
    });
    const alreadyInTarget = new Set(existingInTarget.map((l) => l.itemId));
    const toCreate = links.filter((l) => !alreadyInTarget.has(l.itemId));

    await this.prisma.$transaction([
      this.prisma.itemCollection.createMany({
        data: toCreate.map((l) => ({ itemId: l.itemId, collectionId: toCollectionId })),
      }),
      this.prisma.itemCollection.deleteMany({ where: { collectionId: fromCollectionId } }),
    ]);
  }

  // Dueño real (Collection.ownerId) o miembro vía CollectionMember (colección
  // compartida, grupo familiar) — ambos cuentan como acceso válido, para no
  // depender de sembrar un CollectionMember(OWNER) en cada colección existente.
  private async getMembership(userId: string, id: string): Promise<{ collection: Collection; role: SharedRole }> {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.ownerId === userId) return { collection, role: 'OWNER' };
    const member = await this.prisma.collectionMember.findUnique({
      where: { collectionId_userId: { collectionId: id, userId } },
    });
    if (!member) throw new NotFoundException('Colección no encontrada');
    return { collection, role: member.role };
  }

  private async assertOwnedCollection(userId: string, id: string) {
    const { collection } = await this.getMembership(userId, id);
    return collection;
  }

  // Expuesto para CollectionLocationService (mover/regresar en bloque): exige
  // ser al menos EDITOR, igual que agregar/quitar objetos uno por uno.
  async assertCanManageItems(userId: string, collectionId: string) {
    return this.assertCollectionRole(userId, collectionId, 'EDITOR');
  }

  // Expuesto para CollectionMembersService: invitar/expulsar miembros del
  // grupo familiar es exclusivo del OWNER de la colección.
  async assertOwnerRole(userId: string, collectionId: string) {
    return this.assertCollectionRole(userId, collectionId, 'OWNER');
  }

  private async assertCollectionRole(userId: string, id: string, minRole: 'EDITOR' | 'OWNER') {
    const { collection, role } = await this.getMembership(userId, id);
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException('No tienes permiso para esta acción en la colección');
    }
    return collection;
  }
}
