import { apiFetch, ApiError } from './api';

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

export function createTag(accessToken: string, dto: { name: string; type?: TagType }) {
  return apiFetch<Tag>('/tags', { method: 'POST', body: dto, accessToken });
}

// El backend rechaza nombres duplicados (409) — para un flujo de "crea si no
// existe" simplemente se reusa el tag ya existente con ese nombre.
export async function findOrCreateTag(accessToken: string, name: string, type?: TagType): Promise<Tag> {
  try {
    return await createTag(accessToken, { name, type });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const existing = await fetchTags(accessToken);
      const match = existing.find((tag) => tag.name === name);
      if (match) return match;
    }
    throw err;
  }
}
