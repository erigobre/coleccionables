import { apiFetch } from './api';

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  icon: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

// Orden por relevancia (mayor cantidad de objetos) ya viene resuelto del backend.
// No incluye colecciones suspendidas (plan §5.2.4).
export function fetchActiveCollections(accessToken: string) {
  return apiFetch<Collection[]>('/collections', { accessToken });
}

// Incluye también las suspendidas, para la vista de gestión (plan §5.2.5).
export function fetchCollectionsForManagement(accessToken: string) {
  return apiFetch<Collection[]>('/collections/manage', { accessToken });
}

// Estos 4 endpoints no incluyen itemCount (solo lo calculan los de listado) —
// el llamador debe refrescar la lista para obtener el conteo actualizado.
type CollectionWithoutCount = Omit<Collection, 'itemCount'>;

export function createCollection(accessToken: string, dto: { name: string; icon?: string }) {
  return apiFetch<CollectionWithoutCount>('/collections', { method: 'POST', body: dto, accessToken });
}

export function updateCollection(
  accessToken: string,
  id: string,
  dto: { name?: string; icon?: string },
) {
  return apiFetch<CollectionWithoutCount>(`/collections/${id}`, {
    method: 'PATCH',
    body: dto,
    accessToken,
  });
}

export function suspendCollection(accessToken: string, id: string) {
  return apiFetch<CollectionWithoutCount>(`/collections/${id}/suspend`, {
    method: 'PATCH',
    accessToken,
  });
}

export function activateCollection(accessToken: string, id: string) {
  return apiFetch<CollectionWithoutCount>(`/collections/${id}/activate`, {
    method: 'PATCH',
    accessToken,
  });
}

export function deleteCollection(accessToken: string, id: string, migrateToCollectionId?: string) {
  return apiFetch<void>(`/collections/${id}`, {
    method: 'DELETE',
    body: { migrateToCollectionId },
    accessToken,
  });
}
