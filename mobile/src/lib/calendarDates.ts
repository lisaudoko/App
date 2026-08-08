/**
 * Pure date-math helpers for the Calendar feature. Training weeks have no
 * stored date anywhere — a week's real Mon–Sun dates are always *derived*
 * from `programmes.season_start_date` (the Monday of week 1) plus
 * `week_number`. Everything here is UTC-based (Date.UTC / getUTCDay) so a
 * "YYYY-MM-DD" calendar date never shifts a day depending on the device's
 * local timezone offset.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIsoUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Matches the spec's exact function — local-time based, for display labels only. */
export function getWeekLabel(date: Date): string {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
}

/** UTC equivalent of the Monday-finding logic above, for date-math (not display). */
export function mondayOfIso(iso: string): string {
  const date = parseIsoUtc(iso);
  const day = date.getUTCDay();
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return toIso(monday);
}

export function isMonday(iso: string): boolean {
  return parseIsoUtc(iso).getUTCDay() === 1;
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** day: 1 (Mon) – 7 (Sun), matching WorkoutBlock.day. */
export function dateForWeekDay(seasonStartDate: string, weekNumber: number, day: number): string {
  return addDays(seasonStartDate, (weekNumber - 1) * 7 + (day - 1));
}

/** Inverse of dateForWeekDay — null if dateIso is before the season start. */
export function weekDayForDate(seasonStartDate: string, dateIso: string): { weekNumber: number; day: number } | null {
  const start = parseIsoUtc(seasonStartDate);
  const target = parseIsoUtc(dateIso);
  const diffDays = Math.round((target.getTime() - start.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return null;
  return { weekNumber: Math.floor(diffDays / 7) + 1, day: (diffDays % 7) + 1 };
}

/** Whole calendar days from today until dateIso (negative if in the past). */
export function daysUntil(dateIso: string): number {
  const today = toIso(new Date());
  const diffMs = parseIsoUtc(dateIso).getTime() - parseIsoUtc(today).getTime();
  return Math.round(diffMs / MS_PER_DAY);
}

/** "Tuesday, Mar 10" style label for the day-workout-editor sheet header. */
export function formatFullDate(dateIso: string): string {
  return parseIsoUtc(dateIso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "Aug 23 · 14 days away" style countdown text for upcoming meets. */
export function formatCountdown(dateIso: string): string {
  const days = daysUntil(dateIso);
  const label = parseIsoUtc(dateIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (days === 0) return `${label} · today`;
  if (days === 1) return `${label} · tomorrow`;
  if (days > 1) return `${label} · ${days} days away`;
  return `${label} · ${Math.abs(days)} days ago`;
}

/** The 7 real dates (Mon–Sun) of the week containing dateIso. */
export function weekDatesContaining(dateIso: string): string[] {
  const monday = mondayOfIso(dateIso);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
