import type { MeetAttempt } from '@/data/types';
import { isBetter, type Direction } from '@/lib/formatPerformance';

/** Best legal (non-foul) attempt, direction-aware — null if every attempt is a foul or has no mark. */
export function bestLegalAttempt(attempts: MeetAttempt[], direction: Direction): number | null {
  let best: number | null = null;
  for (const a of attempts) {
    if (a.foul || a.mark == null) continue;
    if (best == null || isBetter(a.mark, best, direction)) best = a.mark;
  }
  return best;
}

/** True once a mark meets or beats the qualifying standard, direction-aware. */
export function meetsStandard(mark: number, standard: number, direction: Direction): boolean {
  return direction === 'higher_better' ? mark >= standard : mark <= standard;
}

/** Recomputes finalMark + qualified from the current attempts list. */
export function deriveMeetEntryResult(
  attempts: MeetAttempt[],
  direction: Direction,
  qualifyingStandard: number | null,
): { finalMark: number | null; qualified: boolean } {
  const finalMark = bestLegalAttempt(attempts, direction);
  const qualified = finalMark != null && qualifyingStandard != null && meetsStandard(finalMark, qualifyingStandard, direction);
  return { finalMark, qualified };
}

/**
 * Meets aren't logged with a training week number, just a calendar date —
 * this approximates one by anchoring to the athlete's earliest dated weekly
 * log and counting calendar weeks from there, so meet results land on
 * roughly the right point along the trajectory chart's week axis.
 */
export function estimateWeekForDate(logs: { week: number; loggedAt: string | null }[], targetDate: string): number {
  const dated = logs.filter((l): l is { week: number; loggedAt: string } => !!l.loggedAt).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  if (dated.length === 0) return 1;
  const anchor = dated[0];
  const anchorTime = new Date(anchor.loggedAt).getTime();
  const targetTime = new Date(targetDate).getTime();
  const weeksDiff = Math.round((targetTime - anchorTime) / (7 * 24 * 60 * 60 * 1000));
  return anchor.week + weeksDiff;
}
