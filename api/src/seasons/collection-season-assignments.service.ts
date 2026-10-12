import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Season } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { computeCurrentOrNextOccurrence, type SeasonOccurrence } from './season-occurrence.util.js';
import type { CreateCollectionSeasonAssignmentDto } from './dto/create-collection-season-assignment.dto.js';
import type { ApplySeasonChecklistDto } from './dto/apply-season-checklist.dto.js';

type Direction = 'start' | 'end';

// Decoupla "asignar una temporada a una colección" (solo guarda la intención:
// temporada + destino) del movimiento real de objetos, que se dispara aparte
// desde el checklist agrupado por ubicación. Como nunca se guarda una lista
// estática de objetos en la asignación, cualquier objeto agregado a la
// colección antes o después queda incluido automáticamente — el checklist
// siempre consulta la membresía actual de la colección en vivo.
@Injectable()
export class CollectionSeasonAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collectionsService: CollectionsService,
    private readonly locationsService: LocationsService,
  ) {}

  async list(userId: string, collectionId: string) {
    await this.collectionsService.assertCanManageItems(userId, collectionId);
    const assignments = await this.prisma.collectionSeasonAssignment.findMany({
      where: { collectionId },
      include: { season: true, destinationLocation: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(assignments.map((a) => this.withComputedState(a)));
  }

  async create(userId: string, collectionId: string, dto: CreateCollectionSeasonAssignmentDto) {
    await this.collectionsService.assertCanManageItems(userId, collectionId);

    const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
    if (!season || season.ownerId !== userId) {
      throw new NotFoundException('Temporada no encontrada');
    }
    await this.locationsService.findOne(userId, dto.destinationLocationId);

    const existing = await this.prisma.collectionSeasonAssignment.findUnique({
      where: { collectionId_seasonId: { collectionId, seasonId: dto.seasonId } },
    });
    if (existing) {
      throw new BadRequestException('Esta temporada ya está asignada a esta colección');
    }

    const assignment = await this.prisma.collectionSeasonAssignment.create({
      data: { collectionId, seasonId: dto.seasonId, destinationLocationId: dto.destinationLocationId },
      include: { season: true, destinationLocation: true },
    });
    return this.withComputedState(assignment);
  }

  async remove(userId: string, collectionId: string, assignmentId: string) {
    await this.collectionsService.assertCanManageItems(userId, collectionId);
    const assignment = await this.prisma.collectionSeasonAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.collectionId !== collectionId) {
      throw new NotFoundException('Asignación no encontrada');
    }
    await this.prisma.collectionSeasonAssignment.delete({ where: { id: assignmentId } });
  }

  async getChecklist(userId: string, collectionId: string, assignmentId: string, direction: Direction) {
    await this.collectionsService.assertCanManageItems(userId, collectionId);
    const assignment = await this.assertAssignment(collectionId, assignmentId);
    return this.loadGroupedPending(assignment, direction);
  }

  async applyChecklist(userId: string, collectionId: string, assignmentId: string, dto: ApplySeasonChecklistDto) {
    await this.collectionsService.assertCanManageItems(userId, collectionId);
    const assignment = await this.assertAssignment(collectionId, assignmentId);
    const groups = await this.loadGroupedPending(assignment, dto.direction);
    const pendingIds = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));

    const targetIds = dto.itemIds ? dto.itemIds.filter((id) => pendingIds.has(id)) : [...pendingIds];
    if (targetIds.length === 0) return { updated: 0 };

    const occurrence = computeCurrentOrNextOccurrence(assignment.season, new Date());

    if (dto.direction === 'start') {
      await this.prisma.item.updateMany({
        where: { id: { in: targetIds } },
        data: {
          currentLocationId: assignment.destinationLocationId,
          locationAssignment: 'TEMPORAL',
          currentSeasonId: assignment.seasonId,
          returnedFromSeason: false,
        },
      });
      await this.prisma.collectionSeasonAssignment.update({
        where: { id: assignment.id },
        data: { lastMovedOccurrenceStart: occurrence?.start ?? null },
      });
    } else {
      // El regreso es por objeto: cada uno vuelve a SU propia ubicación principal,
      // no a un destino único (por eso no se puede usar updateMany con un valor fijo).
      const items = await this.prisma.item.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, permanentLocationId: true },
      });
      await this.prisma.$transaction(
        items.map((item) =>
          this.prisma.item.update({
            where: { id: item.id },
            data: {
              currentLocationId: item.permanentLocationId,
              locationAssignment: 'INDEFINIDO',
              currentSeasonId: null,
              returnedFromSeason: true,
            },
          }),
        ),
      );
      await this.prisma.collectionSeasonAssignment.update({
        where: { id: assignment.id },
        data: { lastReturnedOccurrenceStart: occurrence?.start ?? null },
      });
    }

    await Promise.all(targetIds.map((itemId) => this.locationsService.syncInheritedLocationAccess(itemId)));

    return { updated: targetIds.length };
  }

  private async assertAssignment(collectionId: string, assignmentId: string) {
    const assignment = await this.prisma.collectionSeasonAssignment.findUnique({
      where: { id: assignmentId },
      include: { season: true },
    });
    if (!assignment || assignment.collectionId !== collectionId) {
      throw new NotFoundException('Asignación no encontrada');
    }
    return assignment;
  }

  // Objetos pendientes de mover (direction=start) o de regresar (direction=end)
  // para esta asignación, agrupados por la ubicación relevante de cada lado:
  // al mover se agrupa por dónde está cada objeto hoy (para juntarlos por lugar
  // antes de llevarlos al destino); al regresar se agrupa por a dónde debe
  // volver cada uno (su ubicación principal, que puede variar objeto por objeto).
  private async loadGroupedPending(
    assignment: { collectionId: string; seasonId: string; destinationLocationId: string },
    direction: Direction,
  ) {
    const links = await this.prisma.itemCollection.findMany({
      where: { collectionId: assignment.collectionId, item: { status: 'ACTIVE' } },
      select: {
        item: {
          include: {
            photos: { take: 1, orderBy: { order: 'asc' } },
            currentLocation: true,
            permanentLocation: true,
          },
        },
      },
    });

    const items = links.map((l) => l.item);
    const pending =
      direction === 'start'
        ? items.filter(
            (item) =>
              !(
                item.currentSeasonId === assignment.seasonId &&
                item.locationAssignment === 'TEMPORAL' &&
                item.currentLocationId === assignment.destinationLocationId
              ),
          )
        : items.filter(
            (item) =>
              item.currentSeasonId === assignment.seasonId &&
              item.locationAssignment === 'TEMPORAL' &&
              item.currentLocationId === assignment.destinationLocationId &&
              !item.returnedFromSeason,
          );

    const groups = new Map<string, { locationId: string | null; locationName: string; items: typeof pending }>();
    for (const item of pending) {
      const location = direction === 'start' ? item.currentLocation : item.permanentLocation;
      const key = location?.id ?? 'none';
      if (!groups.has(key)) {
        groups.set(key, { locationId: location?.id ?? null, locationName: location?.name ?? 'Sin ubicación', items: [] });
      }
      groups.get(key)!.items.push(item);
    }

    return [...groups.values()].map((g) => ({
      locationId: g.locationId,
      locationName: g.locationName,
      items: g.items.map((item) => ({
        id: item.id,
        name: item.name,
        photoUrl: item.photos[0]?.url ?? null,
      })),
    }));
  }

  private async withComputedState(assignment: {
    id: string;
    seasonId: string;
    collectionId: string;
    destinationLocationId: string;
    season: Season;
    destinationLocation: { id: string; name: string };
    lastMovedOccurrenceStart: Date | null;
    lastReturnedOccurrenceStart: Date | null;
  }) {
    const now = new Date();
    const occurrence: SeasonOccurrence | null = computeCurrentOrNextOccurrence(assignment.season, now);
    const phase = !occurrence ? 'NONE' : now >= occurrence.start && now <= occurrence.end ? 'ACTIVE' : 'UPCOMING';

    const [pendingStart, pendingEnd] = await Promise.all([
      this.loadGroupedPending(assignment, 'start'),
      this.loadGroupedPending(assignment, 'end'),
    ]);

    return {
      id: assignment.id,
      seasonId: assignment.seasonId,
      collectionId: assignment.collectionId,
      season: assignment.season,
      destinationLocation: assignment.destinationLocation,
      occurrence,
      phase,
      pendingStartCount: pendingStart.reduce((sum, g) => sum + g.items.length, 0),
      pendingEndCount: pendingEnd.reduce((sum, g) => sum + g.items.length, 0),
    };
  }
}
