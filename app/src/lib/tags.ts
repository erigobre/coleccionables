import { apiFetch } from './api';

export type TagType = 'COLOR_PRINCIPAL' | 'FRANCHISE' | 'GENERIC';

export interface Tag {
  id: string;
  ownerId: string;
  name: string;
  type: TagType;
  createdAt: string;
}

export function fetchTags(accessToken: string) {
  return apiFetch<Tag[]>('/tags', { accessToken });
}

// Búsqueda por texto (máx. 20 resultados desde el backend): con potencialmente
// miles de tags por usuario, ya no se cargan todos para pintarlos como chips;
// se buscan como se busca un contacto, según lo que el usuario va escribiendo.
export function searchTags(accessToken: string, query: string) {
  return apiFetch<Tag[]>(`/tags?q=${encodeURIComponent(query)}`, { accessToken });
}

export function createTag(accessToken: string, dto: { name: string; type?: TagType }) {
  return apiFetch<Tag>('/tags', { method: 'POST', body: dto, accessToken });
}

// El backend ya devuelve el tag existente si ese nombre ya está (sin distinguir
// mayúsculas), así que "crea si no existe" es una sola llamada.
export function findOrCreateTag(accessToken: string, name: string, type?: TagType): Promise<Tag> {
  return createTag(accessToken, { name, type });
}
