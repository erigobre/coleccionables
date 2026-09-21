import { apiFetch, apiUpload } from './api';
import type { Collection } from './collections';
import type {
  ConservationState,
  ItemCategory,
  PackagingCondition,
  UsageState,
} from './item-enums';

export type ItemStatus = 'ACTIVE' | 'PENDING_TRANSFER' | 'SOLD' | 'DONATED' | 'LOST';
export type LocationAssignment = 'INDEFINIDO' | 'TEMPORAL';

export interface ItemPhoto {
  id: string;
  url: string;
  order: number;
}

export interface ItemLocationRef {
  id: string;
  name: string;
  isPermanentDefault: boolean;
}

export interface ItemSeasonRef {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface ItemTagRef {
  tagId: string;
  tag: { id: string; name: string; type: 'COLOR_PRINCIPAL' | 'FRANCHISE' | 'GENERIC' };
}

export interface ItemCollectionRef {
  collectionId: string;
  collection: Collection;
}

export interface Item {
  id: string;
  ownerId: string;
  name: string;
  category: ItemCategory;
  packagingCondition: PackagingCondition;
  usageState: UsageState;
  conservationState: ConservationState | null;
  brand: string | null;
  toyLine: string | null;
  edition: string | null;
  scale: string | null;
  designer: string | null;
  releaseYear: number | null;
  originalSetNumber: string | null;
  uniqueIdentifier: string | null;
  purchasePrice: string | null;
  currency: string;
  purchaseLocationText: string | null;
  acquisitionDate: string | null;
  quantity: number;
  isGift: boolean;
  isFavorite: boolean;
  notes: string | null;
  comicCoverNumber: string | null;
  comicIssueNumber: string | null;
  comicWriter: string | null;
  comicPenciler: string | null;
  comicInker: string | null;
  comicColorist: string | null;
  comicPublisher: string | null;
  status: ItemStatus;
  currentLocationId: string | null;
  permanentLocationId: string | null;
  locationAssignment: LocationAssignment;
  currentSeasonId: string | null;
  returnedFromSeason: boolean;
  createdAt: string;
  updatedAt: string;
  photos: ItemPhoto[];
  collections: ItemCollectionRef[];
  tags: ItemTagRef[];
  currentLocation: ItemLocationRef | null;
  permanentLocation: ItemLocationRef | null;
  currentSeason: ItemSeasonRef | null;
}

export interface CreateItemDto {
  name: string;
  category: ItemCategory;
  packagingCondition: PackagingCondition;
  usageState: UsageState;
  conservationState?: ConservationState;
  brand?: string;
  toyLine?: string;
  edition?: string;
  scale?: string;
  designer?: string;
  releaseYear?: number;
  originalSetNumber?: string;
  uniqueIdentifier?: string;
  purchasePrice?: number;
  purchaseLocationText?: string;
  acquisitionDate?: string;
  quantity?: number;
  isGift?: boolean;
  notes?: string;
  comicCoverNumber?: string;
  comicIssueNumber?: string;
  comicWriter?: string;
  comicPenciler?: string;
  comicInker?: string;
  comicColorist?: string;
  comicPublisher?: string;
  locationId?: string;
  collectionIds?: string[];
  tagIds?: string[];
  photoUrls?: string[];
}

// El backend gestiona ubicación/colecciones/tags/fotos con endpoints propios de
// agregar-quitar (no de reemplazo parcial), por eso quedan fuera de este dto.
export type UpdateItemDto = Partial<
  Omit<CreateItemDto, 'locationId' | 'collectionIds' | 'tagIds' | 'photoUrls'>
>;

export function fetchItems(accessToken: string, filters: { collectionId?: string; favoritesOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.collectionId) params.set('collectionId', filters.collectionId);
  if (filters.favoritesOnly) params.set('favoritesOnly', 'true');
  const query = params.toString();
  return apiFetch<Item[]>(`/items${query ? `?${query}` : ''}`, { accessToken });
}

// Vendidos que coinciden con el texto buscado (plan §5.3.9.5). Sin texto no hay
// resultados: los vendidos nunca se listan sueltos.
export function fetchSoldItems(accessToken: string, search: string) {
  return apiFetch<Item[]>(`/items/sold?search=${encodeURIComponent(search)}`, { accessToken });
}

export function fetchItem(accessToken: string, id: string) {
  return apiFetch<Item>(`/items/${id}`, { accessToken });
}

export function createItem(accessToken: string, dto: CreateItemDto) {
  return apiFetch<Item>('/items', { method: 'POST', body: dto, accessToken });
}

export function updateItem(accessToken: string, id: string, dto: UpdateItemDto) {
  return apiFetch<Item>(`/items/${id}`, { method: 'PATCH', body: dto, accessToken });
}

export function deleteItem(accessToken: string, id: string) {
  return apiFetch<void>(`/items/${id}`, { method: 'DELETE', accessToken });
}

// El backend hace un prisma.item.update sin `include`, así que devuelve solo
// los campos escalares del Item (sin photos/collections/tags/location/season).
export type ItemScalar = Omit<
  Item,
  'photos' | 'collections' | 'tags' | 'currentLocation' | 'permanentLocation' | 'currentSeason'
>;

export function toggleFavorite(accessToken: string, id: string) {
  return apiFetch<ItemScalar>(`/items/${id}/favorite`, { method: 'PATCH', accessToken });
}

export function addItemToCollection(accessToken: string, id: string, collectionId: string) {
  return apiFetch<void>(`/items/${id}/collections/${collectionId}`, { method: 'POST', accessToken });
}

export function removeItemFromCollection(accessToken: string, id: string, collectionId: string) {
  return apiFetch<void>(`/items/${id}/collections/${collectionId}`, { method: 'DELETE', accessToken });
}

export function addItemTag(accessToken: string, id: string, tagId: string) {
  return apiFetch<void>(`/items/${id}/tags/${tagId}`, { method: 'POST', accessToken });
}

export function removeItemTag(accessToken: string, id: string, tagId: string) {
  return apiFetch<void>(`/items/${id}/tags/${tagId}`, { method: 'DELETE', accessToken });
}

export type LocationChangeDestination = 'LOCATION' | 'DONATED' | 'LOST';
export type LocationChangeAssignment = 'INDEFINIDO' | 'TEMPORAL';

export function changeItemLocation(
  accessToken: string,
  id: string,
  dto: {
    destination: LocationChangeDestination;
    locationId?: string;
    assignment?: LocationChangeAssignment;
    seasonId?: string;
  },
) {
  return apiFetch<Item>(`/items/${id}/location`, { method: 'PATCH', body: dto, accessToken });
}

export interface MarketPriceResult {
  averagePrice: number | null;
  currency: string;
  availability: 'DISPONIBLE' | 'AGOTADO' | 'NO_EN_MERCADO';
  purchaseLinks: string[];
  summary: string;
  collectorNotes: string;
}

export function lookupMarketPrice(accessToken: string, id: string) {
  return apiFetch<{
    purchasePrice: string | null;
    currency: string;
    market: MarketPriceResult;
  }>(`/items/${id}/market-price`, { method: 'POST', accessToken });
}

// Lo que devuelve Gemini al analizar fotos (api/src/ai/ai.types.ts). Todo es
// opcional salvo suggestedTags: lo que no detectó simplemente no viene.
export interface ExtractedItemData {
  name?: string;
  category?: ItemCategory;
  packagingCondition?: PackagingCondition;
  usageState?: UsageState;
  conservationState?: ConservationState;
  brand?: string;
  toyLine?: string;
  edition?: string;
  scale?: string;
  designer?: string;
  releaseYear?: number;
  originalSetNumber?: string;
  uniqueIdentifier?: string;
  comicCoverNumber?: string;
  comicIssueNumber?: string;
  comicWriter?: string;
  comicPenciler?: string;
  comicInker?: string;
  comicColorist?: string;
  comicPublisher?: string;
  suggestedTags: string[];
}

export interface AnalyzeItemResult {
  extracted: ExtractedItemData;
  photoUrls: string[];
}

// El backend comprime las fotos, así que se mandan tal cual salen de la cámara.
export function analyzeItemPhotos(accessToken: string, photoUris: string[]) {
  const form = new FormData();
  photoUris.forEach((uri, index) => {
    form.append('photos', { uri, name: `foto-${index}.jpg`, type: 'image/jpeg' } as unknown as Blob);
  });
  return apiUpload<AnalyzeItemResult>('/items/analyze', form, accessToken);
}

// Sube fotos sin análisis IA (camino "Manual"); devuelve las URLs relativas.
export async function uploadItemPhotos(accessToken: string, photoUris: string[]): Promise<string[]> {
  return Promise.all(
    photoUris.map(async (uri, index) => {
      const form = new FormData();
      form.append('file', { uri, name: `foto-${index}.jpg`, type: 'image/jpeg' } as unknown as Blob);
      const { url } = await apiUpload<{ url: string }>('/storage/upload', form, accessToken);
      return url;
    }),
  );
}

// Busca el producto por su EAN/UPC (solo dígitos, 8-14). `found: false` cuando
// la IA no lo identificó con certeza.
export function lookupBarcode(accessToken: string, barcode: string) {
  return apiFetch<{ found: boolean; extracted: ExtractedItemData }>('/items/lookup-barcode', {
    method: 'POST',
    body: { barcode },
    accessToken,
  });
}

export function addItemPhotos(accessToken: string, id: string, urls: string[]) {
  return apiFetch<ItemPhoto[]>(`/items/${id}/photos`, { method: 'POST', body: { urls }, accessToken });
}

export function removeItemPhoto(accessToken: string, id: string, photoId: string) {
  return apiFetch<void>(`/items/${id}/photos/${photoId}`, { method: 'DELETE', accessToken });
}

// Enlace público (página web simple, sin la app). Es idempotente: compartir dos
// veces devuelve la misma URL.
export function shareItem(accessToken: string, id: string) {
  return apiFetch<{ token: string; url: string }>(`/items/${id}/share`, { method: 'POST', accessToken });
}

export function unshareItem(accessToken: string, id: string) {
  return apiFetch<void>(`/items/${id}/share`, { method: 'DELETE', accessToken });
}

// Coincidencia de "¿Ya lo tengo?": el backend devuelve el objeto con solo su
// primera foto y su ubicación actual, más el puntaje de similitud (plan §7.2).
export type MatchedItem = ItemScalar & {
  photos: ItemPhoto[];
  currentLocation: { id: string; name: string } | null;
};

export interface ItemMatch {
  item: MatchedItem;
  score: number;
}

export interface IdentifyResult {
  extracted: ExtractedItemData;
  hasMatch: boolean;
  matches: ItemMatch[];
  soldMatches: ItemMatch[];
}

// Identifica el objeto de la foto y lo busca en la colección. No guarda las fotos
// en el servidor: si el usuario decide agregarlo, se suben después.
export function identifyItemPhotos(accessToken: string, photoUris: string[]) {
  const form = new FormData();
  photoUris.forEach((uri, index) => {
    form.append('photos', { uri, name: `foto-${index}.jpg`, type: 'image/jpeg' } as unknown as Blob);
  });
  return apiUpload<IdentifyResult>('/items/identify', form, accessToken);
}
