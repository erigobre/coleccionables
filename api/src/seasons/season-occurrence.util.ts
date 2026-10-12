import type { Season } from '@prisma/client';

export interface SeasonOccurrence {
  start: Date; // 00:00:00.000 local
  end: Date; // 23:59:59.999 local
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

// De las ocurrencias dadas (deben cubrir pasado/presente/futuro de forma
// consecutiva, sin huecos), regresa la primera cuyo fin todavía no pasó: es
// la que está en curso ahora, o si ninguna lo está, la próxima por venir.
function pickCurrentOrNext(occurrences: SeasonOccurrence[], now: Date): SeasonOccurrence | null {
  const sorted = [...occurrences].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const occ of sorted) {
    if (occ.end.getTime() >= now.getTime()) return occ;
  }
  return null;
}

// Día 1-31 recortado al último día real de un mes (ej. 31 en febrero -> 28/29).
function clampDayInMonth(year: number, monthIndex0: number, day: number): Date {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const clamped = Math.min(Math.max(day, 1), lastDay);
  return new Date(year, monthIndex0, clamped);
}

function weeklyOccurrenceAt(now: Date, startWeekday: number, endWeekday: number, cycleOffset: number): SeasonOccurrence {
  const spanDays = (endWeekday - startWeekday + 7) % 7;
  const diffToStart = (startWeekday - now.getDay() + 7) % 7;
  const start = addDays(startOfDay(now), diffToStart + cycleOffset * 7);
  const end = endOfDay(addDays(start, spanDays));
  return { start, end };
}

function monthlyOccurrenceAt(now: Date, startDay: number, endDay: number, cycleOffset: number): SeasonOccurrence {
  const monthIndex0 = now.getMonth() + cycleOffset;
  const start = clampDayInMonth(now.getFullYear(), monthIndex0, startDay);
  // Si el día de fin es menor al de inicio, el evento cruza al mes siguiente.
  const endMonthOffset = endDay >= startDay ? 0 : 1;
  const end = endOfDay(clampDayInMonth(now.getFullYear(), monthIndex0 + endMonthOffset, endDay));
  return { start, end };
}

function yearlyOccurrenceAt(
  now: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  cycleOffset: number,
): SeasonOccurrence {
  const year = now.getFullYear() + cycleOffset;
  const start = clampDayInMonth(year, startMonth - 1, startDay);
  // Si la fecha de fin (mes/día) es anterior a la de inicio dentro del mismo
  // año, el evento cruza a la siguiente (ej. 20 dic -> 6 ene).
  const crossesYear = endMonth < startMonth || (endMonth === startMonth && endDay < startDay);
  const end = endOfDay(clampDayInMonth(crossesYear ? year + 1 : year, endMonth - 1, endDay));
  return { start, end };
}

type SeasonRecurrenceFields = Pick<
  Season,
  | 'recurrence'
  | 'startDate'
  | 'endDate'
  | 'startWeekday'
  | 'endWeekday'
  | 'startDayOfMonth'
  | 'endDayOfMonth'
  | 'startMonth'
  | 'startDay'
  | 'endMonth'
  | 'endDay'
>;

// Ocurrencia actual (si "now" cae dentro de su rango) o, si no hay ninguna en
// curso, la próxima por venir. Para ONE_TIME regresa null si el evento ya
// pasó (no hay "próxima" posible). Para las recurrentes nunca regresa null:
// se repiten indefinidamente, sin año guardado en ningún lado.
export function computeCurrentOrNextOccurrence(season: SeasonRecurrenceFields, now: Date = new Date()): SeasonOccurrence | null {
  switch (season.recurrence) {
    case 'ONE_TIME': {
      if (!season.startDate || !season.endDate) return null;
      const occ = { start: startOfDay(season.startDate), end: endOfDay(season.endDate) };
      return occ.end.getTime() >= now.getTime() ? occ : null;
    }
    case 'WEEKLY': {
      if (season.startWeekday === null || season.endWeekday === null) return null;
      const occurrences = [-1, 0, 1].map((offset) => weeklyOccurrenceAt(now, season.startWeekday!, season.endWeekday!, offset));
      return pickCurrentOrNext(occurrences, now);
    }
    case 'MONTHLY': {
      if (season.startDayOfMonth === null || season.endDayOfMonth === null) return null;
      const occurrences = [-1, 0, 1].map((offset) =>
        monthlyOccurrenceAt(now, season.startDayOfMonth!, season.endDayOfMonth!, offset),
      );
      return pickCurrentOrNext(occurrences, now);
    }
    case 'YEARLY': {
      if (season.startMonth === null || season.startDay === null || season.endMonth === null || season.endDay === null) {
        return null;
      }
      const occurrences = [-1, 0, 1].map((offset) =>
        yearlyOccurrenceAt(now, season.startMonth!, season.startDay!, season.endMonth!, season.endDay!, offset),
      );
      return pickCurrentOrNext(occurrences, now);
    }
    default:
      return null;
  }
}

// Días de calendario completos entre "now" y el inicio de una fecha (ambas se
// truncan a medianoche) — para comparar contra reminderDaysBefore sin que la
// hora del día afecte el conteo.
export function daysUntil(target: Date, now: Date): number {
  const msPerDay = 86400000;
  return Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / msPerDay);
}
