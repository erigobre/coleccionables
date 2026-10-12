import { apiFetch } from './api';

export type SeasonRecurrence = 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Season {
  id: string;
  ownerId: string;
  name: string;
  recurrence: SeasonRecurrence;
  startDate: string | null;
  endDate: string | null;
  startWeekday: number | null;
  endWeekday: number | null;
  startDayOfMonth: number | null;
  endDayOfMonth: number | null;
  startMonth: number | null;
  startDay: number | null;
  endMonth: number | null;
  endDay: number | null;
  reminderDaysBefore: number | null;
  createdAt: string;
}

// Mismos campos que acepta el backend (CreateSeasonDto): solo los que
// correspondan al `recurrence` elegido son obligatorios, el resto se ignora.
export interface SeasonInput {
  name: string;
  recurrence: SeasonRecurrence;
  startDate?: string;
  endDate?: string;
  startWeekday?: number;
  endWeekday?: number;
  startDayOfMonth?: number;
  endDayOfMonth?: number;
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
  reminderDaysBefore?: number | null;
}

export interface SeasonOccurrence {
  start: string;
  end: string;
}

export type SeasonAssignmentPhase = 'NONE' | 'ACTIVE' | 'UPCOMING';

export interface CollectionSeasonAssignment {
  id: string;
  seasonId: string;
  collectionId: string;
  season: Season;
  destinationLocation: { id: string; name: string };
  occurrence: SeasonOccurrence | null;
  phase: SeasonAssignmentPhase;
  pendingStartCount: number;
  pendingEndCount: number;
}

export interface SeasonChecklistItem {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface SeasonChecklistGroup {
  locationId: string | null;
  locationName: string;
  items: SeasonChecklistItem[];
}

export type SeasonChecklistDirection = 'start' | 'end';

// Convierte un par de fechas completas (elegidas con un date picker normal,
// con año y todo) a las anclas que de verdad se guardan para cada tipo de
// recurrencia — el año se descarta a propósito para MONTHLY/YEARLY, nunca se
// manda al backend.
export function anchorsFromDates(recurrence: SeasonRecurrence, start: Date, end: Date): Partial<SeasonInput> {
  switch (recurrence) {
    case 'ONE_TIME':
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    case 'MONTHLY':
      return { startDayOfMonth: start.getDate(), endDayOfMonth: end.getDate() };
    case 'YEARLY':
      return {
        startMonth: start.getMonth() + 1,
        startDay: start.getDate(),
        endMonth: end.getMonth() + 1,
        endDay: end.getDate(),
      };
    default:
      return {};
  }
}

// Inverso: reconstruye fechas "de mentiras" (con el año de hoy) a partir de
// una temporada ya guardada, solo para poder prellenar un date picker al
// editar — ese año reconstruido nunca se vuelve a mandar tal cual.
export function datesFromSeason(season: Season): { start: Date; end: Date } | null {
  const year = new Date().getFullYear();
  switch (season.recurrence) {
    case 'ONE_TIME':
      return season.startDate && season.endDate ? { start: new Date(season.startDate), end: new Date(season.endDate) } : null;
    case 'MONTHLY':
      return season.startDayOfMonth != null && season.endDayOfMonth != null
        ? {
            start: new Date(year, new Date().getMonth(), season.startDayOfMonth),
            end: new Date(year, new Date().getMonth(), season.endDayOfMonth),
          }
        : null;
    case 'YEARLY':
      return season.startMonth != null && season.startDay != null && season.endMonth != null && season.endDay != null
        ? {
            start: new Date(year, season.startMonth - 1, season.startDay),
            end: new Date(year, season.endMonth - 1, season.endDay),
          }
        : null;
    default:
      return null;
  }
}

export const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'Dom' },
  { value: '1', label: 'Lun' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Mié' },
  { value: '4', label: 'Jue' },
  { value: '5', label: 'Vie' },
  { value: '6', label: 'Sáb' },
];

export const RECURRENCE_OPTIONS: { value: SeasonRecurrence; label: string }[] = [
  { value: 'ONE_TIME', label: 'Única ocasión' },
  { value: 'WEEKLY', label: 'Cada semana' },
  { value: 'MONTHLY', label: 'Cada mes' },
  { value: 'YEARLY', label: 'Cada año' },
];

export function describeSeasonRecurrence(season: Season): string {
  const fmtMonthDay = (month: number, day: number) =>
    new Date(2000, month - 1, day).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  switch (season.recurrence) {
    case 'ONE_TIME':
      if (!season.startDate || !season.endDate) return '';
      return `${new Date(season.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} — ${new Date(
        season.endDate,
      ).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    case 'WEEKLY': {
      const label = (v: number | null) => WEEKDAY_OPTIONS.find((o) => Number(o.value) === v)?.label ?? '';
      return `Cada semana: ${label(season.startWeekday)} — ${label(season.endWeekday)}`;
    }
    case 'MONTHLY':
      return `Cada mes: día ${season.startDayOfMonth} — día ${season.endDayOfMonth}`;
    case 'YEARLY':
      if (season.startMonth == null || season.startDay == null || season.endMonth == null || season.endDay == null) return '';
      return `Cada año: ${fmtMonthDay(season.startMonth, season.startDay)} — ${fmtMonthDay(season.endMonth, season.endDay)}`;
    default:
      return '';
  }
}

export function fetchSeasons(accessToken: string) {
  return apiFetch<Season[]>('/seasons', { accessToken });
}

export function fetchSeason(accessToken: string, id: string) {
  return apiFetch<Season>(`/seasons/${id}`, { accessToken });
}

export function createSeason(accessToken: string, dto: SeasonInput) {
  return apiFetch<Season>('/seasons', { method: 'POST', body: dto, accessToken });
}

export function updateSeason(accessToken: string, id: string, dto: Partial<SeasonInput>) {
  return apiFetch<Season>(`/seasons/${id}`, { method: 'PATCH', body: dto, accessToken });
}

export function deleteSeason(accessToken: string, id: string) {
  return apiFetch<void>(`/seasons/${id}`, { method: 'DELETE', accessToken });
}

export function returnItemToPermanentLocation(accessToken: string, itemId: string) {
  return apiFetch(`/items/${itemId}/return-to-permanent-location`, {
    method: 'PATCH',
    accessToken,
  });
}

export function fetchCollectionSeasonAssignments(accessToken: string, collectionId: string) {
  return apiFetch<CollectionSeasonAssignment[]>(`/collections/${collectionId}/season-assignments`, { accessToken });
}

export function createCollectionSeasonAssignment(
  accessToken: string,
  collectionId: string,
  dto: { seasonId: string; destinationLocationId: string },
) {
  return apiFetch<CollectionSeasonAssignment>(`/collections/${collectionId}/season-assignments`, {
    method: 'POST',
    body: dto,
    accessToken,
  });
}

export function removeCollectionSeasonAssignment(accessToken: string, collectionId: string, assignmentId: string) {
  return apiFetch<void>(`/collections/${collectionId}/season-assignments/${assignmentId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function fetchSeasonChecklist(
  accessToken: string,
  collectionId: string,
  assignmentId: string,
  direction: SeasonChecklistDirection,
) {
  return apiFetch<SeasonChecklistGroup[]>(
    `/collections/${collectionId}/season-assignments/${assignmentId}/checklist?direction=${direction}`,
    { accessToken },
  );
}

export function applySeasonChecklist(
  accessToken: string,
  collectionId: string,
  assignmentId: string,
  direction: SeasonChecklistDirection,
  itemIds?: string[],
) {
  return apiFetch<{ updated: number }>(`/collections/${collectionId}/season-assignments/${assignmentId}/checklist/apply`, {
    method: 'POST',
    body: { direction, itemIds },
    accessToken,
  });
}
