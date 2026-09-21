import { apiFetch } from './api';

export interface LocationNode {
  id: string;
  name: string;
  parentId: string | null;
  isPermanentDefault: boolean;
  qrToken: string;
  children: LocationNode[];
}

export function fetchLocationTree(accessToken: string) {
  return apiFetch<LocationNode[]>('/locations', { accessToken });
}

export function createLocation(
  accessToken: string,
  dto: { name: string; parentId?: string },
) {
  return apiFetch<LocationNode>('/locations', { method: 'POST', body: dto, accessToken });
}

export function updateLocation(
  accessToken: string,
  id: string,
  dto: { name?: string; parentId?: string | null },
) {
  return apiFetch<LocationNode>(`/locations/${id}`, { method: 'PATCH', body: dto, accessToken });
}

export function deleteLocation(accessToken: string, id: string) {
  return apiFetch<void>(`/locations/${id}`, { method: 'DELETE', accessToken });
}

export function fetchLocationQr(accessToken: string, id: string) {
  return apiFetch<{ qrToken: string; qrImageDataUrl: string }>(`/locations/${id}/qr`, {
    accessToken,
  });
}

// Aplana el árbol a una lista ordenada (padres antes que hijos) para selects
// planos, conservando la profundidad para indentar en la UI.
export function flattenLocationTree(nodes: LocationNode[], depth = 0): { node: LocationNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenLocationTree(node.children, depth + 1)]);
}
