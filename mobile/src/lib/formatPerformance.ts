export type EventGroup = 'throws' | 'sprints' | 'jumps';
export type PerformanceUnit = 'metres' | 'seconds';
export type Direction = 'higher_better' | 'lower_better';

export const EVENT_GROUP_DIRECTION: Record<EventGroup, Direction> = {
  throws: 'higher_better',
  jumps: 'higher_better',
  sprints: 'lower_better',
};

export const EVENT_GROUP_UNIT: Record<EventGroup, PerformanceUnit> = {
  throws: 'metres',
  jumps: 'metres',
  sprints: 'seconds',
};

export const EVENT_GROUP_LABEL: Record<EventGroup, string> = {
  throws: 'Throws',
  sprints: 'Sprints',
  jumps: 'Jumps',
};

export const EVENT_GROUP_EVENTS: Record<EventGroup, string[]> = {
  throws: ['Shot Put', 'Discus', 'Hammer', 'Javelin'],
  sprints: ['100m', '200m', '400m', '110mH', '400mH'],
  jumps: ['Long Jump', 'Triple Jump', 'High Jump', 'Pole Vault'],
};

/** metres: "16.42m" · seconds <60: "10.82s" · seconds >=60: "1:48.30" (no unit suffix — mm:ss is unambiguous). */
export function formatPerformance(value: number, unit: PerformanceUnit): string {
  if (unit === 'metres') return `${value.toFixed(2)}m`;
  if (value < 60) return `${value.toFixed(2)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/**
 * Formats a pre-normalized gap (positive = still needs improvement, negative
 * = already ahead — see computeGap) as a signed, direction-agnostic label.
 * `direction` is accepted for API clarity/parity even though the sign
 * convention is the same in both directions once gap is normalized.
 */
export function formatGap(gap: number, _direction: Direction, unit: PerformanceUnit): string {
  const suffix = unit === 'metres' ? 'm' : 's';
  const magnitude = Math.abs(gap).toFixed(2);
  return gap > 0 ? `−${magnitude}${suffix} needed` : `+${magnitude}${suffix} ahead`;
}

/** Positive = athlete still needs to close this much distance/time to reach the standard. */
export function computeGap(current: number, standard: number, direction: Direction): number {
  return direction === 'higher_better' ? standard - current : current - standard;
}

/** True if `a` is a better performance than `b` for the given direction. */
export function isBetter(a: number, b: number, direction: Direction): boolean {
  return direction === 'higher_better' ? a > b : a < b;
}

/**
 * Parses a natural-language time into seconds. Accepts "10.82", "48.3", or
 * "1:48.30" / "1:48" (mm:ss[.ms]). Returns null if unparseable.
 */
export function parseTimeToSeconds(text: string): number | null {
  const mmss = text.match(/(\d+):(\d{1,2}(?:\.\d+)?)/);
  if (mmss) {
    const minutes = parseFloat(mmss[1]);
    const seconds = parseFloat(mmss[2]);
    if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) return minutes * 60 + seconds;
  }
  const plain = text.match(/(\d+(?:\.\d+)?)/);
  if (plain) {
    const value = parseFloat(plain[1]);
    if (!Number.isNaN(value)) return value;
  }
  return null;
}
