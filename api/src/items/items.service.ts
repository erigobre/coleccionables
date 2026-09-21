import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { StorageService } from '../storage/storage.service.js';
import { GeminiService } from '../ai/gemini.service.js';
import type { ImageInput } from '../ai/ai.types.js';
import type { CreateItemDto } from './dto/create-item.dto.js';
import type { UpdateItemDto } from './dto/update-item.dto.js';
import { ChangeLocationDto, LocationChangeDestination, LocationChangeAssignment } from './dto/change-location.dto.js';
import type { MatchItemDto } from './dto/match-item.dto.js';
import {
  computeSimilarityScore,
  MIN_DISPLAY_THRESHOLD,
  namesOverlap,
  STRONG_MATCH_THRESHOLD,
  type SimilarityCandidate,
} from './similarity.js';

const ITEM_INCLUDE = {
  photos: { orderBy: { order: 'asc' as const } },
  collections: { include: { collection: true } },
  tags: { include: { tag: true } },
  currentLocation: true,
  permanentLocation: true,
  currentSeason: true,
};

const MAX_SIMILAR_RESULTS = 10;

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collectionsService: CollectionsService,
    private readonly locationsService: LocationsService,
    private readonly storageService: StorageService,
    private readonly geminiService: GeminiService,
  ) {}

  async create(ownerId: string, dto: CreateItemDto) {
    if (dto.locationId) {
      await this.locationsService.findOne(ownerId, dto.locationId);
    }
    if (dto.collectionIds?.length) {
      await Promise.all(
        dto.collectionIds.map((id) => this.collectionsService.assertCanAddItems(ownerId, id)),
      );
    }
    if (dto.tagIds?.length) {
      await this.assertOwnedTags(ownerId, dto.tagIds);
    }

    const { locationId, collectionIds, tagIds, photoUrls, ...fields } = dto;

    return this.prisma.item.create({
      data: {
        ownerId,
        ...fields,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        currentLocationId: locationId ?? null,
        permanentLocationId: locationId ?? null,
        photos: photoUrls?.length
          ? { create: photoUrls.map((url, order) => ({ url, order })) }
          : undefined,
        collections: collectionIds?.length
          ? { create: collectionIds.map((collectionId) => ({ collectionId })) }
          : undefined,
        tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: ITEM_INCLUDE,
    });
  }

  // Vista principal de Objetos: los vendidos desaparecen (plan §5.3.9.4).
  findAll(ownerId: string, filters: { collectionId?: string; favoritesOnly?: boolean } = {}) {
    return this.prisma.item.findMany({
      where: {
        ownerId,
        status: { not: 'SOLD' },
        isFavorite: filters.favoritesOnly ? true : undefined,
        collections: filters.collectionId ? { some: { collectionId: filters.collectionId } } : undefined,
      },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Sección "Objetos vendidos que se relacionan con tu búsqueda" (plan §5.3.9.5).
  // Sin texto de búsqueda no devuelve nada: los vendidos nunca se listan sueltos.
  async findSold(ownerId: string, search?: string) {
    const term = search?.trim();
    if (!term) return [];
    return this.prisma.item.findMany({
      where: {
        ownerId,
        status: 'SOLD',
        OR: [
          { name: { contains: term } },
          { brand: { contains: term } },
          { toyLine: { contains: term } },
          { edition: { contains: term } },
          { uniqueIdentifier: { contains: term } },
        ],
      },
      include: ITEM_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async findOne(ownerId: string, id: string) {
    return this.assertOwnedItem(ownerId, id);
  }

  async update(ownerId: string, id: string, dto: UpdateItemDto) {
    await this.assertEditableItem(ownerId, id);
    return this.prisma.item.update({
      where: { id },
      data: {
        ...dto,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
      },
      include: ITEM_INCLUDE,
    });
  }

  async remove(ownerId: string, id: string) {
    const item = await this.assertOwnedItem(ownerId, id);
    if (item.status === 'SOLD' || item.status === 'PENDING_TRANSFER') {
      throw new BadRequestException('No se puede eliminar un objeto vendido o en transferencia');
    }
    await this.prisma.item.delete({ where: { id } });
  }

  async toggleFavorite(ownerId: string, id: string) {
    const item = await this.assertEditableItem(ownerId, id);
    return this.prisma.item.update({
      where: { id },
      data: { isFavorite: !item.isFavorite },
    });
  }

  async addPhoto(ownerId: string, id: string, url: string) {
    await this.assertEditableItem(ownerId, id);
    // max+1 (no count): al quitar una foto intermedia, count repetiría un order existente.
    const last = await this.prisma.itemPhoto.aggregate({
      where: { itemId: id },
      _max: { order: true },
    });
    return this.prisma.itemPhoto.create({
      data: { itemId: id, url, order: (last._max.order ?? -1) + 1 },
    });
  }

  async removePhoto(ownerId: string, id: string, photoId: string) {
    await this.assertEditableItem(ownerId, id);
    const photo = await this.prisma.itemPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.itemId !== id) {
      throw new NotFoundException('Foto no encontrada');
    }
    await this.prisma.itemPhoto.delete({ where: { id: photoId } });

    // Aceptar una transferencia comparte la URL con el objeto nuevo, y la wishlist
    // también guarda URLs: el archivo solo se borra si ya nadie lo usa.
    const [otherPhotos, wishlistUses] = await Promise.all([
      this.prisma.itemPhoto.count({ where: { url: photo.url } }),
      this.prisma.wishlistItem.count({ where: { photoUrl: photo.url } }),
    ]);
    if (otherPhotos === 0 && wishlistUses === 0) {
      await this.storageService.deleteImage(photo.url);
    }
  }

  async addToCollection(ownerId: string, id: string, collectionId: string) {
    await this.assertEditableItem(ownerId, id);
    await this.collectionsService.assertCanAddItems(ownerId, collectionId);
    await this.prisma.itemCollection.upsert({
      where: { itemId_collectionId: { itemId: id, collectionId } },
      create: { itemId: id, collectionId },
      update: {},
    });
  }

  async removeFromCollection(ownerId: string, id: string, collectionId: string) {
    await this.assertEditableItem(ownerId, id);
    await this.prisma.itemCollection.deleteMany({ where: { itemId: id, collectionId } });
  }

  async addTag(ownerId: string, id: string, tagId: string) {
    await this.assertEditableItem(ownerId, id);
    await this.assertOwnedTags(ownerId, [tagId]);
    await this.prisma.itemTag.upsert({
      where: { itemId_tagId: { itemId: id, tagId } },
      create: { itemId: id, tagId },
      update: {},
    });
  }

  async removeTag(ownerId: string, id: string, tagId: string) {
    await this.assertEditableItem(ownerId, id);
    await this.prisma.itemTag.deleteMany({ where: { itemId: id, tagId } });
  }

  // Modal multi-paso de cambio de ubicación (plan §5.3.9.9). "Vendido" no se
  // maneja aquí: usa TransfersModule porque requiere un receptor y aceptación.
  async changeLocation(ownerId: string, id: string, dto: ChangeLocationDto) {
    await this.assertEditableItem(ownerId, id);

    if (dto.destination === LocationChangeDestination.DONATED) {
      return this.prisma.item.update({ where: { id }, data: { status: 'DONATED' } });
    }
    if (dto.destination === LocationChangeDestination.LOST) {
      return this.prisma.item.update({ where: { id }, data: { status: 'LOST' } });
    }

    if (!dto.locationId || !dto.assignment) {
      throw new BadRequestException('Debes indicar la ubicación destino y si es indefinido o temporal');
    }
    await this.locationsService.findOne(ownerId, dto.locationId);

    if (dto.assignment === LocationChangeAssignment.INDEFINIDO) {
      return this.prisma.item.update({
        where: { id },
        data: {
          currentLocationId: dto.locationId,
          permanentLocationId: dto.locationId,
          locationAssignment: 'INDEFINIDO',
          currentSeasonId: null,
          returnedFromSeason: true,
        },
      });
    }

    if (!dto.seasonId) {
      throw new BadRequestException('Debes indicar a qué temporada se liga el cambio temporal');
    }
    const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
    if (!season || season.ownerId !== ownerId) {
      throw new NotFoundException('Temporada no encontrada');
    }

    return this.prisma.item.update({
      where: { id },
      data: {
        currentLocationId: dto.locationId,
        locationAssignment: 'TEMPORAL',
        currentSeasonId: dto.seasonId,
        returnedFromSeason: false,
      },
    });
  }

  // Botón rápido de la vista de Temporadas (plan §5.5.8).
  async returnToPermanentLocation(ownerId: string, id: string) {
    const item = await this.assertEditableItem(ownerId, id);
    return this.prisma.item.update({
      where: { id: item.id },
      data: {
        currentLocationId: item.permanentLocationId,
        locationAssignment: 'INDEFINIDO',
        currentSeasonId: null,
        returnedFromSeason: true,
      },
    });
  }

  // "Objetos similares" del Home (plan §7.2).
  async findSimilar(ownerId: string, id: string) {
    const item = await this.assertOwnedItem(ownerId, id);
    const candidates = await this.prisma.item.findMany({
      where: { ownerId, status: { not: 'SOLD' }, id: { not: id } },
      include: { tags: { include: { tag: true } } },
    });

    const target: SimilarityCandidate = {
      name: item.name,
      brand: item.brand,
      toyLine: item.toyLine,
      category: item.category,
      tags: item.tags.map((t) => t.tag.name),
    };
    return this.rankCandidates(target, candidates);
  }

  // Flujo "¿Ya lo tengo?" de Home (plan §5.1 y §7.2). Incluye al final los
  // objetos vendidos relacionados, de solo lectura (plan §5.3.9.5).
  async match(ownerId: string, dto: MatchItemDto) {
    // Para las tarjetas de resultado: primera foto y ubicación actual.
    const include = {
      tags: { include: { tag: true } },
      photos: { orderBy: { order: 'asc' as const }, take: 1 },
      currentLocation: { select: { id: true, name: true } },
    };
    const [activeCandidates, soldCandidates] = await Promise.all([
      this.prisma.item.findMany({ where: { ownerId, status: { not: 'SOLD' } }, include }),
      this.prisma.item.findMany({ where: { ownerId, status: 'SOLD' }, include }),
    ]);

    const target: SimilarityCandidate = { ...dto };
    const matches = this.rankCandidates(target, activeCandidates);
    const soldMatches = this.rankCandidates(target, soldCandidates);

    return {
      hasMatch:
        matches.length > 0 &&
        matches[0].score >= STRONG_MATCH_THRESHOLD &&
        namesOverlap(dto.name, matches[0].item.name),
      matches,
      soldMatches,
    };
  }

  // "¿Ya lo tengo?" con foto (plan §5.1): la IA identifica el objeto y se compara
  // contra la colección. A diferencia de `analyzePhotos`, NO guarda las fotos: si
  // el usuario solo consulta, no debe quedar basura en el almacenamiento.
  async identify(ownerId: string, files: ImageInput[]) {
    this.assertHasPhotos(files);
    const extracted = await this.geminiService.analyzePhotos(files);
    await this.prisma.usageEvent.create({ data: { userId: ownerId, type: 'AI_SCAN' } });
    const result = await this.match(ownerId, {
      name: extracted.name,
      brand: extracted.brand,
      toyLine: extracted.toyLine,
      category: Object.values(ItemCategory).find((c) => c === extracted.category),
      tags: extracted.suggestedTags,
    });
    return { extracted, ...result };
  }

  // Botón "Solicitar precio actual promedio de mercado" (plan §5.3.9.10).
  // También pide notas de interés para coleccionista (rareza/tiraje/etc.) en
  // la misma llamada, evitando repetir lo que el usuario ya tiene registrado.
  async lookupMarketPrice(ownerId: string, id: string) {
    const item = await this.assertOwnedItem(ownerId, id);
    const description = [item.name, item.brand, item.toyLine, item.edition, item.releaseYear]
      .filter(Boolean)
      .join(', ');

    const knownFields = [
      ['Categoría', item.category],
      ['Empaque', item.packagingCondition],
      ['Estado de uso', item.usageState],
      ['Conservación', item.conservationState],
      ['Marca', item.brand],
      ['Línea/modelo', item.toyLine],
      ['Edición', item.edition],
      ['Escala/altura', item.scale],
      ['Diseñador', item.designer],
      ['Año de lanzamiento', item.releaseYear],
      ['Número de set original', item.originalSetNumber],
      ['Identificador único', item.uniqueIdentifier],
      ['Cantidad', item.quantity],
      ['Notas existentes del usuario', item.notes],
    ]
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([label, value]) => `- ${label}: ${value}`)
      .join('\n');

    const marketPrice = await this.geminiService.lookupMarketPrice(description, item.currency, knownFields);

    await this.prisma.usageEvent.create({
      data: { userId: ownerId, type: 'MARKET_PRICE_LOOKUP', metadata: { itemId: id } },
    });

    return {
      purchasePrice: item.purchasePrice,
      currency: item.currency,
      market: marketPrice,
    };
  }

  // Botón "Analizar" del flujo de alta (plan §5.3.6-9): sube las fotos ya
  // comprimidas y devuelve los datos estructurados detectados por la IA.
  async analyzePhotos(files: ImageInput[]) {
    this.assertHasPhotos(files);
    const [extracted, photoUrls] = await Promise.all([
      this.geminiService.analyzePhotos(files),
      Promise.all(files.map((file) => this.storageService.saveCompressedImage(file))),
    ]);
    return { extracted, photoUrls };
  }

  private assertHasPhotos(files: ImageInput[] | undefined) {
    if (!files?.length) throw new BadRequestException('Debes enviar al menos una foto');
  }

  // Lectura de código de barras (plan §1/§5.3.6): no requiere fotos, solo el código.
  lookupBarcode(barcode: string) {
    return this.geminiService.lookupBarcode(barcode);
  }

  private rankCandidates<
    C extends {
      id: string;
      name: string;
      brand: string | null;
      toyLine: string | null;
      category: string;
      tags: { tag: { name: string } }[];
    },
  >(target: SimilarityCandidate, candidates: C[]) {
    return candidates
      .map((candidate) => ({
        item: candidate,
        score: computeSimilarityScore(target, {
          name: candidate.name,
          brand: candidate.brand,
          toyLine: candidate.toyLine,
          category: candidate.category,
          tags: candidate.tags.map((t) => t.tag.name),
        }),
      }))
      .filter((result) => result.score >= MIN_DISPLAY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SIMILAR_RESULTS);
  }

  private async assertOwnedTags(ownerId: string, tagIds: string[]) {
    const count = await this.prisma.tag.count({ where: { id: { in: tagIds }, ownerId } });
    if (count !== tagIds.length) {
      throw new BadRequestException('Uno o más tags no existen o no te pertenecen');
    }
  }

  private async assertOwnedItem(ownerId: string, id: string) {
    const item = await this.prisma.item.findUnique({ where: { id }, include: ITEM_INCLUDE });
    if (!item || item.ownerId !== ownerId) {
      throw new NotFoundException('Objeto no encontrado');
    }
    return item;
  }

  // Los objetos vendidos son completamente no editables (plan §5.3.9.5). En
  // transferencia también: si el receptor rechaza, el objeto vuelve a ACTIVE y
  // pisaría cualquier cambio de estado hecho mientras esperaba (p. ej. "Donado").
  private async assertEditableItem(ownerId: string, id: string) {
    const item = await this.assertOwnedItem(ownerId, id);
    if (item.status === 'SOLD') {
      throw new BadRequestException('Un objeto vendido no se puede editar');
    }
    if (item.status === 'PENDING_TRANSFER') {
      throw new BadRequestException('Un objeto en transferencia no se puede editar hasta que responda el receptor');
    }
    return item;
  }
}
