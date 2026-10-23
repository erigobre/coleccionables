import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCategory, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { StorageService } from '../storage/storage.service.js';
import { GeminiService } from '../ai/gemini.service.js';
import { OpenAiService } from '../ai/openai.service.js';
import { FtService } from '../ft/ft.service.js';
import type { GeminiUsage, ImageInput, MarketPriceResult, ModerationSignal } from '../ai/ai.types.js';
import type { CreateItemDto } from './dto/create-item.dto.js';
import type { UpdateItemDto } from './dto/update-item.dto.js';
import type { SetSaleDto } from './dto/set-sale.dto.js';
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
  // Resumen ligero del dueño real: alimenta el banner "Propietario: @fulano"
  // que la app muestra cuando quien ve/edita el objeto es un miembro
  // compartido distinto del dueño (ver ItemsService.resolveItemAccess).
  owner: { select: { id: true, name: true, username: true } },
  // Solo se llena cuando status = PENDING_MODERATION; expone el estado de la
  // aclaración al dueño del objeto (ver ItemsService.submitModerationAppeal).
  moderationFlag: { select: { id: true, userAppeal: true, userAppealAt: true } },
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
    private readonly openAiService: OpenAiService,
    private readonly ftService: FtService,
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

    // Si analyzePhotos detectó una posible persona real, la foto viene con un
    // ModerationFlag (action ITEM_HELD) esperando a que este objeto se ligue a
    // él. Se valida que sea del mismo dueño y que nadie más lo haya usado ya
    // (evita que un moderationFlagId ajeno o reciclado oculte un objeto).
    let heldByModeration = false;
    if (dto.moderationFlagId) {
      const flag = await this.prisma.moderationFlag.findUnique({ where: { id: dto.moderationFlagId } });
      if (!flag || flag.userId !== ownerId || flag.action !== 'ITEM_HELD' || flag.itemId) {
        throw new BadRequestException('moderationFlagId inválido');
      }
      heldByModeration = true;
    }

    const { locationId, collectionIds, tagIds, photoUrls, avatarUrl, moderationFlagId, ...fields } = dto;

    // El avatar 1:1 se usa para el re-ranking visual de "¿Ya lo tengo?" (y a
    // futuro como miniatura de UI). Si vino de analyzePhotos (recorte preciso
    // por bounding box de Gemini) se usa tal cual; si no (alta manual o por
    // código de barras), se genera aquí un recorte cuadrado centrado
    // determinista (sin IA) de la primera foto, para que todo objeto tenga uno.
    const resolvedAvatarUrl =
      avatarUrl ?? (photoUrls?.length ? await this.buildFallbackAvatar(photoUrls[0]) : undefined);

    const item = await this.prisma.item.create({
      data: {
        ownerId,
        ...fields,
        status: heldByModeration ? 'PENDING_MODERATION' : undefined,
        avatarUrl: resolvedAvatarUrl ?? null,
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

    if (heldByModeration) {
      await this.prisma.moderationFlag.update({
        where: { id: dto.moderationFlagId },
        data: { itemId: item.id },
      });
    }

    if (collectionIds?.length) {
      await this.locationsService.syncInheritedLocationAccess(item.id);
    }

    // Un objeto recién creado nunca puede tener ya un ItemFavorite.
    return { ...item, isFavorite: false };
  }

  private async buildFallbackAvatar(photoUrl: string): Promise<string | undefined> {
    const image = await this.storageService.readImage(photoUrl);
    if (!image) return undefined;
    return this.storageService.saveAvatar(image);
  }

  // Vista principal de Objetos: los vendidos desaparecen (plan §5.3.9.4) y los
  // retenidos en moderación tampoco se listan (solo viven en Moderación hasta
  // que un superadmin los revise, ver ItemsService.create).
  //
  // Con collectionId: la colección puede ser compartida (grupo familiar), así
  // que se valida membresía (findOne ya acepta OWNER real o CollectionMember)
  // y se listan los objetos de TODOS los miembros vinculados a ella, no solo
  // los del que llama — igual que ya hace CollectionLocationService.moveAll.
  async findAll(ownerId: string, filters: { collectionId?: string; favoritesOnly?: boolean } = {}) {
    // Los favoritos ya no son una columna del Item (compartida con todos),
    // sino una lista personal por usuario (ItemFavorite) — cada quien
    // favoritea para sí mismo, sin afectar lo que ven los demás miembros.
    let favoriteItemIds: string[] | undefined;
    if (filters.favoritesOnly) {
      const favs = await this.prisma.itemFavorite.findMany({ where: { userId: ownerId }, select: { itemId: true } });
      favoriteItemIds = favs.map((f) => f.itemId);
    }

    if (filters.collectionId) {
      await this.collectionsService.findOne(ownerId, filters.collectionId);
      const items = await this.prisma.item.findMany({
        where: {
          status: { notIn: ['SOLD', 'PENDING_MODERATION'] },
          id: favoriteItemIds ? { in: favoriteItemIds } : undefined,
          collections: { some: { collectionId: filters.collectionId } },
        },
        include: ITEM_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
      return this.withFavorites(ownerId, items);
    }

    const items = await this.prisma.item.findMany({
      where: {
        ownerId,
        status: { notIn: ['SOLD', 'PENDING_MODERATION'] },
        id: favoriteItemIds ? { in: favoriteItemIds } : undefined,
      },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.withFavorites(ownerId, items);
  }

  // Sección "Objetos vendidos que se relacionan con tu búsqueda" (plan §5.3.9.5).
  // Sin texto de búsqueda no devuelve nada: los vendidos nunca se listan sueltos.
  async findSold(ownerId: string, search?: string) {
    const term = search?.trim();
    if (!term) return [];
    const items = await this.prisma.item.findMany({
      where: {
        ownerId,
        status: 'SOLD',
        OR: [
          { name: { contains: term } },
          { brand: { contains: term } },
          { toyLine: { contains: term } },
          { edition: { contains: term } },
          { uniqueIdentifier: { contains: term } },
          { tags: { some: { tag: { name: { contains: term } } } } },
        ],
      },
      include: ITEM_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return this.withFavorites(ownerId, items);
  }

  async findOne(actingUserId: string, id: string) {
    const { item, role } = await this.resolveItemAccess(actingUserId, id);
    const withFav = await this.withFavorite(actingUserId, item);
    if (role === 'OWNER') return { ...withFav, myPendingActionRequests: [] as string[] };
    // Para que la app muestre "Solicitud enviada, esperando autorización" en vez
    // de dejar pedir de nuevo la misma acción mientras ya hay una pendiente.
    const pending = await this.prisma.itemActionRequest.findMany({
      where: { itemId: id, requestedByUserId: actingUserId, status: 'PENDING' },
      select: { action: true },
    });
    return { ...withFav, myPendingActionRequests: pending.map((p) => p.action) };
  }

  // El dueño puede pedir una aclaración una sola vez mientras el objeto está
  // retenido (status PENDING_MODERATION); el superadmin la ve en Moderación
  // al resolver el ModerationFlag (action ITEM_HELD) ligado. Estrictamente del
  // dueño: es un asunto de cuenta/legal, no se expande a miembros compartidos.
  async submitModerationAppeal(ownerId: string, id: string, message: string) {
    const item = await this.assertOwnedItem(ownerId, id);
    if (item.status !== 'PENDING_MODERATION' || !item.moderationFlag) {
      throw new BadRequestException('Este objeto no está en revisión');
    }
    if (item.moderationFlag.userAppeal) {
      throw new BadRequestException('Ya enviaste una aclaración para este objeto');
    }
    await this.prisma.moderationFlag.update({
      where: { id: item.moderationFlag.id },
      data: { userAppeal: message, userAppealAt: new Date() },
    });
    const updated = await this.assertOwnedItem(ownerId, id);
    return this.withFavorite(ownerId, updated);
  }

  async update(actingUserId: string, id: string, dto: UpdateItemDto) {
    await this.resolveEditableItem(actingUserId, id);
    const updated = await this.prisma.item.update({
      where: { id },
      data: {
        ...dto,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
      },
      include: ITEM_INCLUDE,
    });
    return this.withFavorite(actingUserId, updated);
  }

  async remove(ownerId: string, id: string) {
    const item = await this.assertOwnedItem(ownerId, id);
    if (item.status === 'SOLD' || item.status === 'PENDING_TRANSFER') {
      throw new BadRequestException('No se puede eliminar un objeto vendido o en transferencia');
    }
    await this.prisma.item.delete({ where: { id } });
    await this.collectionsService.refreshSaleCollectionStatus(ownerId);
  }

  // "Objeto en venta": pone/actualiza el precio, o cambia entre en venta, apartado
  // y vendido. Mientras esté en venta o apartado pertenece a la colección
  // automática "En Venta"; al marcarlo vendido sale de ella (falta transferirlo).
  // Estrictamente del dueño real: un editor debe pasar por ItemActionRequest
  // (autorización) para poner en venta un objeto que no es suyo.
  async setSale(ownerId: string, id: string, dto: SetSaleDto) {
    const item = await this.assertEditableItem(ownerId, id);

    if (dto.status !== 'SOLD' && dto.price === undefined && item.salePrice === null) {
      throw new BadRequestException('Indica el precio al que quieres vender este objeto');
    }

    const updated = await this.prisma.item.update({
      where: { id },
      data: { saleStatus: dto.status, salePrice: dto.price },
      include: ITEM_INCLUDE,
    });

    if (dto.status === 'SOLD') {
      await this.collectionsService.removeFromSaleCollection(ownerId, id);
    } else {
      await this.collectionsService.addToSaleCollection(ownerId, id);
    }
    const final = await this.prisma.item.findUniqueOrThrow({ where: { id: updated.id }, include: ITEM_INCLUDE });
    return this.withFavorite(ownerId, final);
  }

  // Saca el objeto del sistema de ventas (precio incluido). A diferencia de
  // ponerlo en venta, cualquier miembro con acceso puede hacerlo sin
  // autorización: reducir exposición es más seguro que crearla.
  async clearSale(actingUserId: string, id: string) {
    await this.resolveEditableItem(actingUserId, id);
    await this.prisma.item.update({ where: { id }, data: { saleStatus: null, salePrice: null } });
    await this.collectionsService.removeFromSaleCollection(actingUserId, id);
    const final = await this.prisma.item.findUniqueOrThrow({ where: { id }, include: ITEM_INCLUDE });
    return this.withFavorite(actingUserId, final);
  }

  // Favoritos: lista personal por usuario (ItemFavorite), no una propiedad
  // compartida del objeto — cada quien favoritea para sí mismo sin afectar a
  // los demás miembros que también tienen acceso.
  async toggleFavorite(actingUserId: string, id: string) {
    const { item } = await this.resolveItemAccess(actingUserId, id);
    const key = { userId_itemId: { userId: actingUserId, itemId: id } };
    const existing = await this.prisma.itemFavorite.findUnique({ where: key });
    if (existing) {
      await this.prisma.itemFavorite.delete({ where: key });
    } else {
      await this.prisma.itemFavorite.create({ data: { userId: actingUserId, itemId: id } });
    }
    return { ...item, isFavorite: !existing };
  }

  async addPhoto(actingUserId: string, id: string, url: string) {
    await this.resolveEditableItem(actingUserId, id);
    // max+1 (no count): al quitar una foto intermedia, count repetiría un order existente.
    const last = await this.prisma.itemPhoto.aggregate({
      where: { itemId: id },
      _max: { order: true },
    });
    return this.prisma.itemPhoto.create({
      data: { itemId: id, url, order: (last._max.order ?? -1) + 1 },
    });
  }

  async removePhoto(actingUserId: string, id: string, photoId: string) {
    await this.resolveEditableItem(actingUserId, id);
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

  async addToCollection(actingUserId: string, id: string, collectionId: string) {
    await this.resolveEditableItem(actingUserId, id);
    await this.collectionsService.assertCanAddItems(actingUserId, collectionId);
    await this.prisma.itemCollection.upsert({
      where: { itemId_collectionId: { itemId: id, collectionId } },
      create: { itemId: id, collectionId },
      update: {},
    });
    await this.locationsService.syncInheritedLocationAccess(id);
  }

  async removeFromCollection(actingUserId: string, id: string, collectionId: string) {
    await this.resolveEditableItem(actingUserId, id);
    await this.collectionsService.assertCanRemoveItems(actingUserId, collectionId);
    await this.prisma.itemCollection.deleteMany({ where: { itemId: id, collectionId } });
    await this.locationsService.syncInheritedLocationAccess(id);
  }

  async addTag(actingUserId: string, id: string, tagId: string) {
    await this.resolveEditableItem(actingUserId, id);
    // El tag viene de la lista personal de quien edita, no del dueño real del
    // objeto — un miembro compartido solo puede usar sus propios tags.
    await this.assertOwnedTags(actingUserId, [tagId]);
    await this.prisma.itemTag.upsert({
      where: { itemId_tagId: { itemId: id, tagId } },
      create: { itemId: id, tagId },
      update: {},
    });
  }

  async removeTag(actingUserId: string, id: string, tagId: string) {
    await this.resolveEditableItem(actingUserId, id);
    await this.prisma.itemTag.deleteMany({ where: { itemId: id, tagId } });
  }

  // Modal multi-paso de cambio de ubicación (plan §5.3.9.9). "Vendido" no se
  // maneja aquí: usa TransfersModule porque requiere un receptor y aceptación.
  async changeLocation(actingUserId: string, id: string, dto: ChangeLocationDto) {
    const item = await this.resolveEditableItem(actingUserId, id);

    if (dto.destination === LocationChangeDestination.DONATED) {
      const updated = await this.prisma.item.update({ where: { id }, data: { status: 'DONATED' } });
      return this.withFavorite(actingUserId, updated);
    }
    if (dto.destination === LocationChangeDestination.LOST) {
      const updated = await this.prisma.item.update({ where: { id }, data: { status: 'LOST' } });
      return this.withFavorite(actingUserId, updated);
    }

    if (!dto.locationId || !dto.assignment) {
      throw new BadRequestException('Debes indicar la ubicación destino y si es indefinido o temporal');
    }
    // Quien mueve el objeto solo necesita poder acceder él mismo a la ubicación
    // destino (suya, o ya compartida) — la visibilidad del dueño real se logra
    // después, automáticamente, vía syncInheritedLocationAccess más abajo.
    await this.locationsService.assertAccessible(actingUserId, dto.locationId, 'EDITOR');

    if (dto.assignment === LocationChangeAssignment.INDEFINIDO) {
      const updated = await this.prisma.item.update({
        where: { id },
        data: {
          currentLocationId: dto.locationId,
          permanentLocationId: dto.locationId,
          locationAssignment: 'INDEFINIDO',
          currentSeasonId: null,
          returnedFromSeason: true,
        },
      });
      await this.locationsService.syncInheritedLocationAccess(id);
      return this.withFavorite(actingUserId, updated);
    }

    // Sin temporada ("No aplica"): solo cambia la ubicación actual, la principal
    // se queda como estaba y no hay temporada que dispare el regreso automático.
    // La temporada es del dueño real del objeto, no de quien ejecuta el cambio.
    let currentSeasonId: string | null = null;
    if (dto.seasonId) {
      const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
      if (!season || season.ownerId !== item.ownerId) {
        throw new NotFoundException('Temporada no encontrada');
      }
      currentSeasonId = dto.seasonId;
    }

    const updated = await this.prisma.item.update({
      where: { id },
      data: {
        currentLocationId: dto.locationId,
        locationAssignment: 'TEMPORAL',
        currentSeasonId,
        returnedFromSeason: false,
      },
    });
    await this.locationsService.syncInheritedLocationAccess(id);
    return this.withFavorite(actingUserId, updated);
  }

  // Botón rápido de la vista de Temporadas (plan §5.5.8).
  async returnToPermanentLocation(actingUserId: string, id: string) {
    const item = await this.resolveEditableItem(actingUserId, id);
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        currentLocationId: item.permanentLocationId,
        locationAssignment: 'INDEFINIDO',
        currentSeasonId: null,
        returnedFromSeason: true,
      },
    });
    await this.locationsService.syncInheritedLocationAccess(id);
    return this.withFavorite(actingUserId, updated);
  }

  // "Objetos similares" del Home (plan §7.2).
  async findSimilar(actingUserId: string, id: string) {
    const { item } = await this.resolveItemAccess(actingUserId, id);
    const candidates = await this.prisma.item.findMany({
      where: { ownerId: item.ownerId, status: { notIn: ['SOLD', 'PENDING_MODERATION'] }, id: { not: id } },
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
  // objetos vendidos relacionados, de solo lectura (plan §5.3.9.5). Además de
  // los objetos propios, busca entre los del "grupo familiar": objetos de
  // otros miembros ya vinculados a una colección compartida en común, para
  // detectar si el objeto ya lo tiene alguien de la familia.
  async match(ownerId: string, dto: MatchItemDto) {
    // Para las tarjetas de resultado: primera foto y ubicación actual.
    const include = {
      tags: { include: { tag: true } },
      photos: { orderBy: { order: 'asc' as const }, take: 1 },
      currentLocation: { select: { id: true, name: true } },
    };
    const sharedCollectionIds = await this.sharedCollectionIdsFor(ownerId);
    const [ownCandidates, groupCandidates, soldCandidates] = await Promise.all([
      this.prisma.item.findMany({ where: { ownerId, status: { notIn: ['SOLD', 'PENDING_MODERATION'] } }, include }),
      sharedCollectionIds.length
        ? this.prisma.item.findMany({
            where: {
              ownerId: { not: ownerId },
              status: { notIn: ['SOLD', 'PENDING_MODERATION'] },
              collections: { some: { collectionId: { in: sharedCollectionIds } } },
            },
            include,
          })
        : Promise.resolve([]),
      this.prisma.item.findMany({ where: { ownerId, status: 'SOLD' }, include }),
    ]);

    const target: SimilarityCandidate = { ...dto };
    const matches = this.rankCandidates(target, [...ownCandidates, ...groupCandidates]);
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
  // Cobra FrikiTokens (SCAN_HAVE_IT): ver módulo `ft`.
  async identify(ownerId: string, organizationId: string, files: ImageInput[], idempotencyKey: string) {
    this.assertHasPhotos(files);
    return this.ftService.runChargedAction(
      { organizationId, userId: ownerId, service: 'SCAN_HAVE_IT', idempotencyKey },
      async () => {
        const { result: extracted, usage, moderation, boundingBox } = await this.geminiService.analyzePhotos(files);
        await this.blockIfUnsafe(organizationId, ownerId, 'identify', moderation);
        // "identify" nunca sube ni guarda la foto (a diferencia de analyzePhotos),
        // así que no hay objeto que retener: solo se marca para revisión, sin
        // ITEM_HELD ni photoUrls (ver flagAfterUpload).
        if (moderation?.containsIdentifiablePerson === true || moderation?.isLikelyCollectible === false) {
          await this.prisma.moderationFlag.create({
            data: {
              organizationId,
              userId: ownerId,
              context: 'identify',
              category: moderation.containsIdentifiablePerson ? 'possible_person' : 'not_collectible',
              detail: moderation.moderationNote,
              action: 'FLAGGED_FOR_REVIEW',
            },
          });
        }
        const matchResult = await this.match(ownerId, {
          name: extracted.name,
          brand: extracted.brand,
          toyLine: extracted.toyLine,
          category: Object.values(ItemCategory).find((c) => c === extracted.category),
          tags: extracted.suggestedTags,
        });

        const { matches, hasMatch, visualCostUsd, visualUsage } = await this.applyVisualRerank(
          files[0],
          boundingBox,
          matchResult.matches,
          matchResult.hasMatch,
        );

        return {
          data: { extracted, ...matchResult, matches, hasMatch },
          realCostUsd: GeminiService.estimateCostUsd(usage) + visualCostUsd,
          promptTokens: usage.promptTokens + visualUsage.promptTokens,
          candidatesTokens: usage.candidatesTokens + visualUsage.candidatesTokens,
          totalTokens: usage.totalTokens + visualUsage.totalTokens,
          groundingRequests: usage.groundingQueries + visualUsage.groundingQueries,
          modelVersion: usage.modelVersion,
          usageEventType: 'AI_SCAN' as const,
        };
      },
    );
  }

  // "¿Es Coleccionable?" (Home, plan nuevo): identifica el objeto y lo
  // califica de 0-5 estrellas + precio de lanzamiento + precio actual de
  // mercado. A diferencia de `identify()`, NO compara contra la colección del
  // usuario (no hay detección de duplicados, es investigación de mercado) ni
  // guarda ninguna foto. Cobra FT (COLLECTIBILITY_CHECK).
  async checkCollectibility(ownerId: string, organizationId: string, files: ImageInput[], idempotencyKey: string) {
    this.assertHasPhotos(files);
    return this.ftService.runChargedAction(
      { organizationId, userId: ownerId, service: 'COLLECTIBILITY_CHECK', idempotencyKey },
      async () => {
        const { result, usage, moderation } = await this.openAiService.analyzeCollectibility(files);
        await this.blockIfUnsafe(organizationId, ownerId, 'checkCollectibility', moderation);
        if (moderation?.containsIdentifiablePerson === true || moderation?.isLikelyCollectible === false) {
          await this.prisma.moderationFlag.create({
            data: {
              organizationId,
              userId: ownerId,
              context: 'checkCollectibility',
              category: moderation.containsIdentifiablePerson ? 'possible_person' : 'not_collectible',
              detail: moderation.moderationNote,
              action: 'FLAGGED_FOR_REVIEW',
            },
          });
        }

        return {
          data: result,
          realCostUsd: OpenAiService.estimateCostUsd(usage),
          promptTokens: usage.promptTokens,
          candidatesTokens: usage.candidatesTokens,
          totalTokens: usage.totalTokens,
          groundingRequests: usage.groundingQueries,
          modelVersion: usage.modelVersion,
          usageEventType: 'AI_SCAN' as const,
        };
      },
    );
  }

  // Etapa 2 del re-ranking "¿Ya lo tengo?" (etapa 1 = puntaje por texto, sin
  // tocar — ver similarity.ts): compara la foto de consulta contra los
  // avatares de los top-3 candidatos por texto. Solo se confirma un match si
  // el mejor puntaje visual supera VISUAL_MATCH_THRESHOLD (config, default 70);
  // si no, se mantiene "no lo tienes" y esos candidatos se muestran igual como
  // "objetos similares" con su puntaje visual como badge.
  private async applyVisualRerank<M extends { item: { id: string; avatarUrl?: string | null; photos: { url: string }[] }; score: number }>(
    queryFile: ImageInput,
    boundingBox: import('../ai/ai.types.js').BoundingBox | undefined,
    matches: M[],
    fallbackHasMatch: boolean,
  ): Promise<{
    matches: (M & { visualScore?: number })[];
    hasMatch: boolean;
    visualCostUsd: number;
    visualUsage: GeminiUsage;
  }> {
    const zeroUsage: GeminiUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, groundingQueries: 0 };
    const topCandidates = matches.slice(0, 3);
    if (topCandidates.length === 0) {
      return { matches, hasMatch: fallbackHasMatch, visualCostUsd: 0, visualUsage: zeroUsage };
    }

    const labels = ['A', 'B', 'C'];
    const resolved = await Promise.all(
      topCandidates.map(async (match, index) => {
        const url = match.item.avatarUrl ?? match.item.photos[0]?.url;
        const image = url ? await this.storageService.readImage(url) : null;
        return image ? { label: labels[index], image, match } : null;
      }),
    );
    const candidates = resolved.filter((c): c is { label: string; image: ImageInput; match: M } => c !== null);

    if (candidates.length === 0) {
      return { matches, hasMatch: fallbackHasMatch, visualCostUsd: 0, visualUsage: zeroUsage };
    }

    const queryImage = await this.storageService.cropToAvatar(queryFile, boundingBox);
    const { result: visual, usage } = await this.geminiService.compareCandidates(
      queryImage,
      candidates.map(({ label, image }) => ({ label, image })),
    );

    const scoreByItemId = new Map(candidates.map((c) => [c.match.item.id, visual.scores[c.label] ?? 0]));
    const scoredMatches = matches.map((match) => ({
      ...match,
      visualScore: scoreByItemId.get(match.item.id),
    }));

    const threshold = await this.ftService.getConfigValue('VISUAL_MATCH_THRESHOLD', 70);
    let best: { itemId: string; score: number } | null = null;
    for (const [itemId, score] of scoreByItemId) {
      if (!best || score > best.score) best = { itemId, score };
    }
    const confirmed = best && best.score >= threshold ? best : null;

    const reordered = confirmed
      ? [
          scoredMatches.find((m) => m.item.id === confirmed.itemId)!,
          ...scoredMatches.filter((m) => m.item.id !== confirmed.itemId),
        ]
      : scoredMatches;

    return { matches: reordered, hasMatch: !!confirmed, visualCostUsd: GeminiService.estimateCostUsd(usage), visualUsage: usage };
  }

  // Antes de cobrar nada: le dice a la app si ya hay un precio de mercado
  // guardado (y de cuándo) para poder ofrecer la elección "usar ese dato por
  // menos FT" vs "consultar uno nuevo por más FT" (plan FrikiTokens, decisión
  // confirmada con el owner 2026-09-22).
  async peekMarketPrice(actingUserId: string, id: string) {
    const { item } = await this.resolveItemAccess(actingUserId, id);
    const catalog = await this.ftService.getCatalog();
    const costOf = (key: string) => catalog.find((c) => c.key === key)?.ftCost ?? null;
    const history = await this.prisma.marketPriceCheck.findMany({
      where: { itemId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      cached: item.lastMarketPriceResult
        ? {
            market: item.lastMarketPriceResult as unknown as MarketPriceResult,
            fetchedAt: item.lastMarketPriceAt,
            ftCost: costOf('MARKET_PRICE_CACHED'),
          }
        : null,
      fresh: { ftCost: costOf('MARKET_PRICE_FRESH') },
      history: history.map((h) => ({
        id: h.id,
        market: h.result as unknown as MarketPriceResult,
        fetchedAt: h.createdAt,
        fromCache: h.fromCache,
        ftCost: h.ftCost,
      })),
    };
  }

  // Botón "Solicitar precio actual promedio de mercado" (plan §5.3.9.10).
  // `mode: 'cached'` reutiliza `lastMarketPriceResult` (barato); `mode: 'fresh'`
  // vuelve a preguntarle a Gemini y actualiza ese caché. Ambos cobran FT.
  async lookupMarketPrice(
    actingUserId: string,
    organizationId: string,
    id: string,
    mode: 'cached' | 'fresh',
    idempotencyKey: string,
  ) {
    const { item } = await this.resolveItemAccess(actingUserId, id);
    const catalog = await this.ftService.getCatalog();
    const costOf = (key: string) => catalog.find((c) => c.key === key)?.ftCost ?? null;

    if (mode === 'cached') {
      if (!item.lastMarketPriceResult) {
        throw new BadRequestException('Todavía no hay un precio de mercado guardado para este objeto');
      }
      return this.ftService.runChargedAction(
        { organizationId, userId: actingUserId, service: 'MARKET_PRICE_CACHED', idempotencyKey, metadata: { itemId: id } },
        async () => {
          await this.prisma.marketPriceCheck.create({
            data: {
              itemId: id,
              result: item.lastMarketPriceResult as unknown as Prisma.InputJsonValue,
              fromCache: true,
              ftCost: costOf('MARKET_PRICE_CACHED'),
            },
          });
          return {
            data: {
              purchasePrice: item.purchasePrice,
              currency: item.currency,
              market: item.lastMarketPriceResult as unknown as MarketPriceResult,
              fetchedAt: item.lastMarketPriceAt,
              fromCache: true,
            },
            usageEventType: 'MARKET_PRICE_LOOKUP' as const,
            usageEventMetadata: { itemId: id, fromCache: true },
          };
        },
      );
    }

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

    return this.ftService.runChargedAction(
      { organizationId, userId: actingUserId, service: 'MARKET_PRICE_FRESH', idempotencyKey, metadata: { itemId: id } },
      async () => {
        const { result: marketPrice, usage } = await this.openAiService.lookupMarketPrice(
          description,
          item.currency,
          knownFields,
        );
        const fetchedAt = new Date();
        await this.prisma.item.update({
          where: { id },
          data: {
            lastMarketPriceResult: marketPrice as unknown as Prisma.InputJsonValue,
            lastMarketPriceAt: fetchedAt,
          },
        });
        await this.prisma.marketPriceCheck.create({
          data: {
            itemId: id,
            result: marketPrice as unknown as Prisma.InputJsonValue,
            fromCache: false,
            ftCost: costOf('MARKET_PRICE_FRESH'),
          },
        });
        return {
          data: {
            purchasePrice: item.purchasePrice,
            currency: item.currency,
            market: marketPrice,
            fetchedAt,
            fromCache: false,
          },
          realCostUsd: OpenAiService.estimateCostUsd(usage),
          promptTokens: usage.promptTokens,
          candidatesTokens: usage.candidatesTokens,
          totalTokens: usage.totalTokens,
          groundingRequests: usage.groundingQueries,
          modelVersion: usage.modelVersion,
          usageEventType: 'MARKET_PRICE_LOOKUP' as const,
          usageEventMetadata: { itemId: id, fromCache: false },
        };
      },
    );
  }

  // Adjunta el precio actual de mercado ya obtenido por "¿Es Coleccionable?"
  // a un objeto recién creado, exactamente como si se hubiera presionado
  // "Buscar precio actual" (crea un MarketPriceCheck) pero SIN cobrar FT de
  // nuevo — ya se pagó una sola vez con COLLECTIBILITY_CHECK.
  async attachMarketPrice(actingUserId: string, id: string, market: MarketPriceResult) {
    await this.resolveItemAccess(actingUserId, id);
    const fetchedAt = new Date();
    await this.prisma.item.update({
      where: { id },
      data: {
        lastMarketPriceResult: market as unknown as Prisma.InputJsonValue,
        lastMarketPriceAt: fetchedAt,
      },
    });
    await this.prisma.marketPriceCheck.create({
      data: {
        itemId: id,
        result: market as unknown as Prisma.InputJsonValue,
        fromCache: false,
        ftCost: 0,
      },
    });
  }

  // Botón "Analizar" del flujo de alta (plan §5.3.6-9): sube las fotos ya
  // comprimidas y devuelve los datos estructurados detectados por la IA.
  // Cobra FrikiTokens (CREATE_WITH_AI): ver módulo `ft`.
  async analyzePhotos(ownerId: string, organizationId: string, files: ImageInput[], idempotencyKey: string) {
    this.assertHasPhotos(files);
    return this.ftService.runChargedAction(
      { organizationId, userId: ownerId, service: 'CREATE_WITH_AI', idempotencyKey },
      async () => {
        // Ojo: NO se sube la foto en paralelo con el análisis (a diferencia de
        // antes) — si Google la rechaza por seguridad, no debe quedar guardada.
        const { result: extracted, usage, moderation, boundingBox } = await this.geminiService.analyzePhotos(files);
        await this.blockIfUnsafe(organizationId, ownerId, 'analyzePhotos', moderation);
        const [photoUrls, avatarUrl] = await Promise.all([
          Promise.all(files.map((file) => this.storageService.saveCompressedImage(file))),
          this.storageService.saveAvatar(files[0], boundingBox),
        ]);
        // Con las fotos ya subidas, "persona real"/"no parece coleccionable" se
        // marcan para moderación (ver flagAfterUpload) SIN bloquear el análisis:
        // el objeto se sigue creando, solo queda retenido si corresponde.
        const moderationFlagId = await this.flagAfterUpload(
          organizationId,
          ownerId,
          'analyzePhotos',
          moderation,
          photoUrls,
        );
        return {
          data: { extracted, photoUrls, avatarUrl, moderationFlagId },
          realCostUsd: GeminiService.estimateCostUsd(usage),
          promptTokens: usage.promptTokens,
          candidatesTokens: usage.candidatesTokens,
          totalTokens: usage.totalTokens,
          groundingRequests: usage.groundingQueries,
          modelVersion: usage.modelVersion,
          usageEventType: 'AI_SCAN' as const,
        };
      },
    );
  }

  // Moderación de contenido de las fotos subidas (plan confirmado con el owner
  // 2026-09-22, extendido 2026-09-29 con el retenido automático de objetos
  // con persona real detectada — ver flagAfterUpload).
  // blockedByGoogleSafety (filtro propio de Gemini, auditado por Google): la
  // señal más confiable → se registra el incidente Y se suspende la cuenta de
  // inmediato, sin siquiera subir la foto. `runChargedAction` libera el cobro
  // de FT al propagarse esta excepción, así que nunca se cobra por un intento así.
  private async blockIfUnsafe(
    organizationId: string,
    userId: string,
    context: string,
    moderation: ModerationSignal | undefined,
  ) {
    if (!moderation?.blockedByGoogleSafety) return;

    await this.prisma.$transaction([
      this.prisma.moderationFlag.create({
        data: {
          organizationId,
          userId,
          context,
          category: moderation.blockedCategories.join(', ') || 'safety_block',
          detail: moderation.moderationNote,
          action: 'AUTO_SUSPENDED',
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } }),
    ]);
    throw new ForbiddenException(
      'Esta foto fue bloqueada por nuestro filtro de contenido y tu cuenta fue suspendida. Si crees que es un error, contacta a soporte.',
    );
  }

  // isLikelyCollectible/containsIdentifiablePerson (chequeo propio, pedido al
  // mismo modelo): menos confiable que el filtro de Google — una
  // figura/muñeco con rostro humano puede disparar un falso positivo — así
  // que nunca suspende sola a nadie. Diferencia entre las dos categorías
  // (decisión 2026-09-29, a raíz de "no quiero que la app sea usada para
  // malas prácticas"):
  // - containsIdentifiablePerson: retiene el objeto (ITEM_HELD) — no aparece
  //   en Objetos hasta que un superadmin lo revise (ver ItemsService.create).
  //   No se distingue "es un niño" con una señal aparte de la IA (estimar
  //   edad por foto es poco confiable); el criterio queda en manos del
  //   moderador humano al ver la foto en el panel.
  // - isLikelyCollectible === false (y no hay persona): solo queda marcado
  //   para revisión, el objeto se guarda normal — igual que antes.
  private async flagAfterUpload(
    organizationId: string,
    userId: string,
    context: string,
    moderation: ModerationSignal | undefined,
    photoUrls: string[],
  ): Promise<string | null> {
    if (!moderation) return null;

    if (moderation.containsIdentifiablePerson === true) {
      const flag = await this.prisma.moderationFlag.create({
        data: {
          organizationId,
          userId,
          context,
          category: 'possible_person',
          detail: moderation.moderationNote,
          action: 'ITEM_HELD',
          photoUrls,
        },
      });
      return flag.id;
    }

    if (moderation.isLikelyCollectible === false) {
      await this.prisma.moderationFlag.create({
        data: {
          organizationId,
          userId,
          context,
          category: 'not_collectible',
          detail: moderation.moderationNote,
          action: 'FLAGGED_FOR_REVIEW',
          photoUrls,
        },
      });
    }

    return null;
  }

  private assertHasPhotos(files: ImageInput[] | undefined) {
    if (!files?.length) throw new BadRequestException('Debes enviar al menos una foto');
  }

  // Lectura de código de barras (plan §1/§5.3.6): no requiere fotos, solo el
  // código. También usa IA con búsqueda web, así que también cobra FT
  // (BARCODE_LOOKUP) aunque el spec original no la contemplaba explícitamente.
  async lookupBarcode(ownerId: string, organizationId: string, barcode: string, idempotencyKey: string) {
    return this.ftService.runChargedAction(
      { organizationId, userId: ownerId, service: 'BARCODE_LOOKUP', idempotencyKey, metadata: { barcode } },
      async () => {
        const { result, usage } = await this.geminiService.lookupBarcode(barcode);
        return {
          data: result,
          realCostUsd: GeminiService.estimateCostUsd(usage),
          promptTokens: usage.promptTokens,
          candidatesTokens: usage.candidatesTokens,
          totalTokens: usage.totalTokens,
          groundingRequests: usage.groundingQueries,
          modelVersion: usage.modelVersion,
          usageEventType: 'AI_SCAN' as const,
        };
      },
    );
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

  // Estricto: solo el dueño real pasa. Sigue siendo la puerta de setSale,
  // remove y submitModerationAppeal — un editor debe pasar por
  // ItemActionRequest (autorización del dueño) para esas tres.
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
  // Estricto (dueño real) — usado solo por setSale.
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

  // Acceso compartido a objetos: el dueño real siempre puede, y también
  // cualquiera que sea miembro de una colección compartida (>1 CollectionMember)
  // a la que el objeto esté vinculado. Reemplaza a assertOwnedItem en los
  // métodos de lectura/edición de info — ver plan "Acceso compartido a
  // objetos + autorización del dueño".
  async resolveItemAccess(userId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId }, include: ITEM_INCLUDE });
    if (!item) throw new NotFoundException('Objeto no encontrado');
    if (item.ownerId === userId) return { item, role: 'OWNER' as const };
    const sharedIds = await this.sharedCollectionIdsFor(userId);
    if (sharedIds.length) {
      const link = await this.prisma.itemCollection.findFirst({
        where: { itemId, collectionId: { in: sharedIds } },
      });
      if (link) return { item, role: 'EDITOR' as const };
    }
    throw new NotFoundException('Objeto no encontrado');
  }

  // Igual que resolveItemAccess, pero además exige que el objeto esté en un
  // estado editable (ni vendido ni en transferencia pendiente).
  private async resolveEditableItem(userId: string, itemId: string) {
    const { item } = await this.resolveItemAccess(userId, itemId);
    if (item.status === 'SOLD') {
      throw new BadRequestException('Un objeto vendido no se puede editar');
    }
    if (item.status === 'PENDING_TRANSFER') {
      throw new BadRequestException('Un objeto en transferencia no se puede editar hasta que responda el receptor');
    }
    return item;
  }

  // isFavorite ya no es una columna de Item (compartida), sino una lista
  // personal por usuario (ItemFavorite) — se resuelve por request según quién
  // pide, sin cambiar la forma del contrato que ya espera el frontend.
  private async withFavorite<T extends { id: string }>(actingUserId: string, item: T) {
    const fav = await this.prisma.itemFavorite.findUnique({
      where: { userId_itemId: { userId: actingUserId, itemId: item.id } },
    });
    return { ...item, isFavorite: !!fav };
  }

  private async withFavorites<T extends { id: string }>(actingUserId: string, items: T[]) {
    if (items.length === 0) return [] as (T & { isFavorite: boolean })[];
    const favs = await this.prisma.itemFavorite.findMany({
      where: { userId: actingUserId, itemId: { in: items.map((i) => i.id) } },
      select: { itemId: true },
    });
    const favoriteIds = new Set(favs.map((f) => f.itemId));
    return items.map((item) => ({ ...item, isFavorite: favoriteIds.has(item.id) }));
  }

  // Colecciones compartidas (grupo familiar) donde userId es miembro junto con
  // al menos otra persona — una colección con un solo CollectionMember todavía
  // no está realmente compartida (p. ej. invitación enviada pero no aceptada).
  private async sharedCollectionIdsFor(userId: string) {
    const memberships = await this.prisma.collectionMember.findMany({
      where: { userId },
      select: { collectionId: true, collection: { select: { _count: { select: { members: true } } } } },
    });
    return memberships.filter((m) => m.collection._count.members > 1).map((m) => m.collectionId);
  }
}
