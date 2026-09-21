import { apiFetch } from './api';
import type { ItemCategory } from './item-enums';

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
}

export interface CreateWishlistItemDto {
  name: string;
  category?: ItemCategory;
  photoUrl?: string;
  foundAt?: string;
  price?: number;
  notes?: string;
}

// Plan §5.4.3: solo "dónde lo viste" y "precio" se editan a mano.
export type UpdateWishlistItemDto = Partial<Pick<CreateWishlistItemDto, 'foundAt' | 'price' | 'notes'>>;

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
