import { apiFetch } from './api';
import type { ItemActionType } from './items';

export type ItemActionRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

interface ItemActionRequestBase {
  id: string;
  itemId: string;
  action: ItemActionType;
  toEmail: string | null;
  price: string | null;
  status: ItemActionRequestStatus;
  createdAt: string;
  expiresAt: string;
  item: { id: string; name: string };
}

export interface IncomingItemActionRequest extends ItemActionRequestBase {
  requestedByUser: { id: string; name: string; username: string | null };
}

export type OutgoingItemActionRequest = ItemActionRequestBase;

export function createItemActionRequest(
  accessToken: string,
  itemId: string,
  dto: { action: ItemActionType; toEmail?: string; price?: number },
) {
  return apiFetch<OutgoingItemActionRequest>(`/items/${itemId}/action-requests`, {
    method: 'POST',
    body: dto,
    accessToken,
  });
}

export function fetchIncomingItemActionRequests(accessToken: string) {
  return apiFetch<IncomingItemActionRequest[]>('/items/action-requests/incoming', { accessToken });
}

export function fetchOutgoingItemActionRequests(accessToken: string) {
  return apiFetch<OutgoingItemActionRequest[]>('/items/action-requests/outgoing', { accessToken });
}

export function acceptItemActionRequest(accessToken: string, requestId: string) {
  return apiFetch<{ success: true }>(`/items/action-requests/${requestId}/accept`, { method: 'POST', accessToken });
}

export function rejectItemActionRequest(accessToken: string, requestId: string) {
  return apiFetch<{ success: true }>(`/items/action-requests/${requestId}/reject`, { method: 'POST', accessToken });
}
