import type { WeeklyLog } from '@/data/types';
import { buildTrajectory } from './projections';
import { mean } from './stats';
import type { Direction } from '@/lib/formatPerformance';

export type PeakStatus = 'green' | 'yellow' | 'red';

export interface PeakTimingResult {
  status: PeakStatus;
  headline: string;
  detail: string[];
}

/**
 * Heuristic peak-timing read: combines recent trend direction with recent RPE
 * trend to flag athletes tracking to peak on time vs early/late/off.
 */
export function estimatePeakTiming(logs: WeeklyLog[], direction: Direction = 'higher_better'): PeakTimingResult {
  const logged = logs.filter((l) => l.mark != null);
  const rpeLogged = logs.filter((l) => l.rpe != null) as (WeeklyLog & { rpe: number })[];

  if (logged.length < 3 || rpeLogged.length < 3) {
    return { status: 'yellow', detail: ['Not enough data logged yet'], headline: 'Insufficient data' };
  }

  const { slopePerWeek } = buildTrajectory(logs, 1, direction);
  // Normalize so positive always means "improving", regardless of whether the
  // raw metric trends up (throws/jumps) or down (sprint times).
  const improvementSlope = direction === 'lower_better' ? -slopePerWeek : slopePerWeek;

  const recentRpe = rpeLogged.slice(-3).map((l) => l.rpe);
  const earlierRpe = rpeLogged.slice(-6, -3).map((l) => l.rpe);
  const rpeTrend = mean(recentRpe) - (earlierRpe.length ? mean(earlierRpe) : mean(recentRpe));

  const detail: string[] = [];
  detail.push(rpeTrend > 0.4 ? 'RPE trending up' : rpeTrend < -0.4 ? 'RPE trending down' : 'RPE stable');
  detail.push(
    improvementSlope > 0.02 ? 'Form improving this block' : improvementSlope < -0.02 ? 'Form dipping this block' : 'Form holding steady',
  );

  if (improvementSlope > 0 && rpeTrend <= 0.6) {
    return { status: 'green', headline: 'On track', detail };
  }
  if (improvementSlope > 0 && rpeTrend > 0.6) {
    detail.push('May peak a week early');
    return { status: 'yellow', headline: 'Borderline', detail };
  }
  if (improvementSlope <= 0 && rpeTrend > 0) {
    detail.push('Fatigue rising without form gains');
    return { status: 'red', headline: 'Needs adjustment', detail };
  }
  detail.push('May be under-loaded for this phase');
  return { status: 'yellow', headline: 'Borderline', detail };
}
