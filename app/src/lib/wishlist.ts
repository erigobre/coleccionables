import { apiFetch } from './api';
import type { ConservationState, ItemCategory } from './item-enums';
import type { ExtractedItemData } from './items';

export interface WishlistItem {
  id: string;
  name: string;
  category: ItemCategory | null;
  photoUrl: string | null;
  foundAt: string | null;
  // Decimal de Prisma: llega como string.
  price: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;

  // Info extendida detectada por la IA (no se muestra en wishlist, solo prellena
  // el alta si se traspasa el item a "Objetos"). Ver CreateWishlistItemDto.
  conservationState: ConservationState | null;
  brand: string | null;
  toyLine: string | null;
  edition: string | null;
  scale: string | null;
  designer: string | null;
  releaseYear: number | null;
  originalSetNumber: string | null;
  uniqueIdentifier: string | null;
  comicCoverNumber: string | null;
  comicIssueNumber: string | null;
  comicWriter: string | null;
  comicPenciler: string | null;
  comicInker: string | null;
  comicColorist: string | null;
  comicPublisher: string | null;
  suggestedTags: string[] | null;
  avatarUrl: string | null;
}

export interface CreateWishlistItemDto {
  name: string;
  category?: ItemCategory;
  photoUrl?: string;
  foundAt?: string;
  price?: number;
  notes?: string;
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
  suggestedTags?: string[];
  avatarUrl?: string;
}

// Plan §5.4.3: solo "dónde lo viste" y "precio" se editan a mano.
export type UpdateWishlistItemDto = Partial<Pick<CreateWishlistItemDto, 'foundAt' | 'price' | 'notes'>>;

// Mapea lo detectado por la IA a los campos extendidos de wishlist (no
// visibles en la UI, solo alimentan el prellenado si luego se traspasa a
// "Objetos"). Compartido entre ya-lo-tengo.tsx y wishlist.tsx para no
// duplicar el mapeo campo por campo.
export function wishlistFieldsFromExtracted(extracted: ExtractedItemData) {
  return {
    conservationState: extracted.conservationState,
    brand: extracted.brand ?? undefined,
    toyLine: extracted.toyLine ?? undefined,
    edition: extracted.edition ?? undefined,
    scale: extracted.scale ?? undefined,
    designer: extracted.designer ?? undefined,
    releaseYear: extracted.releaseYear ?? undefined,
    originalSetNumber: extracted.originalSetNumber ?? undefined,
    uniqueIdentifier: extracted.uniqueIdentifier ?? undefined,
    comicCoverNumber: extracted.comicCoverNumber ?? undefined,
    comicIssueNumber: extracted.comicIssueNumber ?? undefined,
    comicWriter: extracted.comicWriter ?? undefined,
    comicPenciler: extracted.comicPenciler ?? undefined,
    comicInker: extracted.comicInker ?? undefined,
    comicColorist: extracted.comicColorist ?? undefined,
    comicPublisher: extracted.comicPublisher ?? undefined,
    suggestedTags: extracted.suggestedTags?.length ? extracted.suggestedTags : undefined,
  };
}

export function fetchWishlist(accessToken: string) {
  return apiFetch<WishlistItem[]>('/wishlist', { accessToken });
}

export function createWishlistItem(accessToken: string, dto: CreateWishlistItemDto) {
  return apiFetch<WishlistItem>('/wishlist', { method: 'POST', body: dto, accessToken });
}

export function updateWishlistItem(accessToken: string, id: string, dto: UpdateWishlistItemDto) {
  return apiFetch<WishlistItem>(`/wishlist/${id}`, { method: 'PATCH', body: dto, accessToken });
}

export function deleteWishlistItem(accessToken: string, id: string) {
  return apiFetch<void>(`/wishlist/${id}`, { method: 'DELETE', accessToken });
}
