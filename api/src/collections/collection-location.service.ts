import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { CollectionsService } from './collections.service.js';
import { LocationChangeAssignment } from '../items/dto/change-location.dto.js';
import type { MoveCollectionDto } from './dto/move-collection.dto.js';

// Reubicación en bloque: aplica a cada objeto de la colección la misma regla que
// ItemsService.changeLocation. Solo se mueven los ACTIVE: un objeto en transferencia
// no se puede editar (si el receptor rechaza, pisaríamos el cambio) y los vendidos,
// donados o perdidos ya no están con el dueño. En una colección compartida, afecta
// los objetos de todos los miembros (no solo los de quien ejecuta la acción), ya
// que quien la ejecuta ya pasó assertCanManageItems (OWNER o EDITOR).
@Injectable()
export class CollectionLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationsService: LocationsService,
    private readonly collectionsService: CollectionsService,
  ) {}

  async moveAll(ownerId: string, collectionId: string, dto: MoveCollectionDto) {
    await this.collectionsService.assertCanManageItems(ownerId, collectionId);
    await this.locationsService.findOne(ownerId, dto.locationId);

    const isTemporal = dto.assignment === LocationChangeAssignment.TEMPORAL;
    if (isTemporal) {
      if (!dto.seasonId) {
        throw new BadRequestException('Debes indicar a qué temporada se liga el cambio temporal');
      }
      const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
      if (!season || season.ownerId !== ownerId) {
        throw new NotFoundException('Temporada no encontrada');
      }
    }

    const links = await this.prisma.itemCollection.findMany({
      where: { collectionId },
      select: { item: { select: { id: true, status: true } } },
    });
    const movableIds = links.filter((l) => l.item.status === 'ACTIVE').map((l) => l.item.id);
    const pending = links.filter((l) => l.item.status === 'PENDING_TRANSFER').length;

    if (movableIds.length > 0) {
      await this.prisma.item.updateMany({
        where: { id: { in: movableIds } },
        data: isTemporal
          ? {
              currentLocationId: dto.locationId,
              locationAssignment: 'TEMPORAL',
              currentSeasonId: dto.seasonId,
              returnedFromSeason: false,
            }
          : {
              currentLocationId: dto.locationId,
              permanentLocationId: dto.locationId,
              locationAssignment: 'INDEFINIDO',
              currentSeasonId: null,
              returnedFromSeason: true,
            },
      });
      await Promise.all(movableIds.map((itemId) => this.locationsService.syncInheritedLocationAccess(itemId)));
    }

    return { updated: movableIds.length, skippedInTransfer: pending };
  }

  // "Marcar todos" de la vista de regreso a la ubicación permanente: cada objeto
  // que esté fuera de su lugar vuelve al suyo (misma regla que ItemsService.returnToPermanentLocation).
  async returnAll(ownerId: string, collectionId: string) {
    await this.collectionsService.assertCanManageItems(ownerId, collectionId);

    const links = await this.prisma.itemCollection.findMany({
      where: {
        collectionId,
        item: { status: 'ACTIVE', permanentLocationId: { not: null } },
      },
      select: { item: { select: { id: true, currentLocationId: true, permanentLocationId: true, locationAssignment: true } } },
    });
    const away = links
      .map((l) => l.item)
      .filter((i) => i.currentLocationId !== i.permanentLocationId || i.locationAssignment === 'TEMPORAL');

    await this.prisma.$transaction(
      away.map((i) =>
        this.prisma.item.update({
          where: { id: i.id },
          data: {
            currentLocationId: i.permanentLocationId,
            locationAssignment: 'INDEFINIDO',
            currentSeasonId: null,
            returnedFromSeason: true,
          },
        }),
      ),
    );
    await Promise.all(away.map((i) => this.locationsService.syncInheritedLocationAccess(i.id)));

    return { returned: away.length };
  }
}
