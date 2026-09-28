import { apiFetch } from './api';

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  icon: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  isDefault: boolean;
  isSystem: boolean; // "En Venta": la administra el sistema
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

export function fetchCollection(accessToken: string, id: string) {
  return apiFetch<CollectionWithoutCount>(`/collections/${id}`, { accessToken });
}

// Reubica todos los objetos de la colección (mismos pasos que el cambio de ubicación
// de un objeto: destino → indefinido/temporal → temporada). Los objetos en
// transferencia se saltan y se reportan aparte.
export function moveCollectionLocation(
  accessToken: string,
  id: string,
  dto: { locationId: string; assignment: 'INDEFINIDO' | 'TEMPORAL'; seasonId?: string },
) {
  return apiFetch<{ updated: number; skippedInTransfer: number }>(`/collections/${id}/location`, {
    method: 'PATCH',
    body: dto,
    accessToken,
  });
}

// Regresa a su ubicación permanente todos los objetos de la colección que estén fuera de ella.
export function returnCollectionToPermanentLocation(accessToken: string, id: string) {
  return apiFetch<{ returned: number }>(`/collections/${id}/return-to-permanent-location`, {
    method: 'PATCH',
    accessToken,
  });
}

// Enlace público con cuadrícula de la colección. Es idempotente: compartir dos
// veces devuelve la misma URL.
export function shareCollection(accessToken: string, id: string) {
  return apiFetch<{ token: string; url: string }>(`/collections/${id}/share`, { method: 'POST', accessToken });
}

export function unshareCollection(accessToken: string, id: string) {
  return apiFetch<void>(`/collections/${id}/share`, { method: 'DELETE', accessToken });
}

export function fetchCollectionShare(accessToken: string, id: string) {
  return apiFetch<{ shared: boolean; url: string | null }>(`/collections/${id}/share`, { accessToken });
}
