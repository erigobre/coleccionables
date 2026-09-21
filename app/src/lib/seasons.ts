import { apiFetch } from './api';

export interface Season {
  id: string;
  ownerId: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface SeasonItemLocation {
  id: string;
  name: string;
}

export interface SeasonItem {
  id: string;
  name: string;
  currentLocation: SeasonItemLocation | null;
  permanentLocation: SeasonItemLocation | null;
}

export function fetchSeasons(accessToken: string) {
  return apiFetch<Season[]>('/seasons', { accessToken });
}

export function fetchSeason(accessToken: string, id: string) {
  return apiFetch<Season>(`/seasons/${id}`, { accessToken });
}

export function createSeason(
  accessToken: string,
  dto: { name: string; startDate: string; endDate: string },
) {
  return apiFetch<Season>('/seasons', { method: 'POST', body: dto, accessToken });
}

export function updateSeason(
  accessToken: string,
  id: string,
  dto: { name?: string; startDate?: string; endDate?: string },
) {
  return apiFetch<Season>(`/seasons/${id}`, { method: 'PATCH', body: dto, accessToken });
}

export function deleteSeason(accessToken: string, id: string) {
  return apiFetch<void>(`/seasons/${id}`, { method: 'DELETE', accessToken });
}

export function fetchSeasonItems(accessToken: string, id: string) {
  return apiFetch<SeasonItem[]>(`/seasons/${id}/items`, { accessToken });
}

export function returnItemToPermanentLocation(accessToken: string, itemId: string) {
  return apiFetch(`/items/${itemId}/return-to-permanent-location`, {
    method: 'PATCH',
    accessToken,
  });
}
