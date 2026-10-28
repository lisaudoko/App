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
  sprints: 'Sprints & track',
  jumps: 'Jumps',
};

export const EVENT_GROUP_EVENTS: Record<EventGroup, string[]> = {
  throws: ['Shot Put', 'Discus', 'Hammer', 'Javelin'],
  sprints: ['100m', '200m', '400m', '800m', '1500m', '110mH', '400mH'],
  jumps: ['Long Jump', 'Triple Jump', 'High Jump', 'Pole Vault'],
};

/**
 * Best-effort event-name → group lookup, for contexts (meet entries) where the
 * event is free text and may not match the athlete's own default event group —
 * e.g. a sprinter entered in a jump at a meet. Falls back to null (caller should
 * fall back to the athlete's default group) when the text doesn't match anything.
 */
export function inferEventGroup(eventName: string): EventGroup | null {
  const s = eventName.toLowerCase();
  if (/shot|discus|hammer|javelin|throw/.test(s)) return 'throws';
  if (/jump|vault/.test(s)) return 'jumps';
  if (/hurdle|dash|sprint|relay|steeple|mile|\d/.test(s)) return 'sprints';
  return null;
}

/** metres: "16.42m" · seconds <60: "10.82s" · seconds >=60: "1:48.30" (no unit suffix — mm:ss is unambiguous). */
export function formatPerformance(value: number, unit: PerformanceUnit): string {
  if (unit === 'metres') return `${value.toFixed(2)}m`;
  if (value < 60) return `${value.toFixed(2)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
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

/** User-facing word for a result: sprinters run a "time", field athletes record a "mark". */
export function performanceNoun(unit: PerformanceUnit): 'time' | 'mark' {
  return unit === 'seconds' ? 'time' : 'mark';
}

/** Wind is only recorded (and only legal-checked) for the short sprints, hurdles and the horizontal jumps. */
export function eventUsesWind(eventName: string): boolean {
  return /\b(100|200|110)\s*m?(h|\b)|hurdle|long jump|triple jump/i.test(eventName);
}

/** Per-attempt wording that fits the event: throws/horizontal jumps have fouls, sprints have false starts, the bar events have misses. */
export function attemptWording(group: EventGroup, eventName: string): { unitNoun: 'Attempt' | 'Run'; failLabel: 'Foul' | 'False start' | 'Miss' } {
  if (group === 'sprints') return { unitNoun: 'Run', failLabel: 'False start' };
  if (/high jump|pole vault/i.test(eventName)) return { unitNoun: 'Attempt', failLabel: 'Miss' };
  return { unitNoun: 'Attempt', failLabel: 'Foul' };
}


/** One-line attempt summary, e.g. "16.10 · X · 15.82 (+1.2)". X = foul/miss, FS = false start. */
export function formatAttemptsSummary(
  attempts: { mark: number | null; wind: string | null; foul: boolean }[],
  unit: PerformanceUnit,
  group: EventGroup,
): string {
  const failShort = group === 'sprints' ? 'FS' : 'X';
  return attempts
    .map((a) => {
      if (a.foul) return failShort;
      if (a.mark == null) return '—';
      return `${formatPerformance(a.mark, unit)}${a.wind ? ` (${a.wind})` : ''}`;
    })
    .join(' · ');
}

/** Parses what someone typed into a result field: "16.42" for metres, "10.82" or "1:48.30" for seconds. */
export function parsePerformanceText(text: string, unit: PerformanceUnit): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = unit === 'seconds' ? parseTimeToSeconds(trimmed) : parseFloat(trimmed);
  return value != null && Number.isFinite(value) ? value : null;
}

/** The inverse, for filling an input from a stored value: 108.3s → "1:48.30", everything else as-is. */
export function performanceToInput(value: number | null, unit: PerformanceUnit): string {
  if (value == null) return '';
  if (unit === 'seconds' && value >= 60) {
    const minutes = Math.floor(value / 60);
    return `${minutes}:${(value - minutes * 60).toFixed(2).padStart(5, '0')}`;
  }
  return String(value);
}

/** iOS's decimal pad has no colon, so timed fields need the fuller punctuation keyboard to allow 1:48.30. */
export function performanceKeyboard(unit: PerformanceUnit): 'decimal-pad' | 'numbers-and-punctuation' {
  return unit === 'seconds' ? 'numbers-and-punctuation' : 'decimal-pad';
}
