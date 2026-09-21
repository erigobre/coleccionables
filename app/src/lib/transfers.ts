import { apiFetch } from './api';
import type { Item, ItemPhoto } from './items';

export type TransferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// El item viaja solo con su primera foto (take: 1 en el backend).
type TransferItem = Item & { photos: ItemPhoto[] };

interface TransferBase {
  id: string;
  itemId: string;
  status: TransferStatus;
  expiresAt: string;
  createdAt: string;
  item: TransferItem;
}

// El receptor solo ve el nombre del remitente (nunca su correo).
export interface IncomingTransfer extends TransferBase {
  fromUser: { id: string; name: string };
}

export interface OutgoingTransfer extends TransferBase {
  toUser: { id: string; name: string; email: string };
}

export function initiateTransfer(accessToken: string, itemId: string, toUserEmail: string) {
  return apiFetch<{ id: string }>('/transfers', { method: 'POST', body: { itemId, toUserEmail }, accessToken });
}

export function fetchIncomingTransfers(accessToken: string) {
  return apiFetch<IncomingTransfer[]>('/transfers/incoming', { accessToken });
}

export function fetchOutgoingTransfers(accessToken: string) {
  return apiFetch<OutgoingTransfer[]>('/transfers/outgoing', { accessToken });
}

export function acceptTransfer(accessToken: string, transferId: string, targetCollectionId: string) {
  return apiFetch<Item>(`/transfers/${transferId}/accept`, {
    method: 'POST',
    body: { targetCollectionId },
    accessToken,
  });
}

export function rejectTransfer(accessToken: string, transferId: string) {
  return apiFetch<void>(`/transfers/${transferId}/reject`, { method: 'POST', accessToken });
}

export function cancelTransfer(accessToken: string, transferId: string) {
  return apiFetch<void>(`/transfers/${transferId}/cancel`, { method: 'POST', accessToken });
}
