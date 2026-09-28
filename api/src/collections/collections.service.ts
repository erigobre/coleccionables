import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_COLLECTIONS } from './default-collections.js';
import type { CreateCollectionDto } from './dto/create-collection.dto.js';
import type { UpdateCollectionDto } from './dto/update-collection.dto.js';
import type { RemoveCollectionDto } from './dto/remove-collection.dto.js';

const SALE_COLLECTION_NAME = 'En Venta';
const SALE_COLLECTION_ICON = 'pricetag-outline';

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
  async findAllActive(ownerId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { ownerId, status: 'ACTIVE' },
      include: { _count: { select: { itemLinks: true } } },
    });

    return collections
      .map((c) => ({ ...c, itemCount: c._count.itemLinks }))
      .sort((a, b) => b.itemCount - a.itemCount);
  }

  // "En Venta" (isSystem) no se administra desde aquí: no se edita, suspende ni borra.
  async findAllForManagement(ownerId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { ownerId, isSystem: false },
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
  async assertCanAddItems(ownerId: string, collectionId: string) {
    const collection = await this.assertOwnedCollection(ownerId, collectionId);
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
  async assertCanRemoveItems(ownerId: string, collectionId: string) {
    const collection = await this.assertOwnedCollection(ownerId, collectionId);
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

  private async assertUserManageable(ownerId: string, id: string) {
    const collection = await this.assertOwnedCollection(ownerId, id);
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

  private async assertOwnedCollection(ownerId: string, id: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection || collection.ownerId !== ownerId) {
      throw new NotFoundException('Colección no encontrada');
    }
    return collection;
  }
}
