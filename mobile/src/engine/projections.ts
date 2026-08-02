import type { WeeklyLog } from '@/data/types';
import { linearRegression } from './stats';

export interface TrajectoryPoint {
  week: number;
  mark: number;
}

export interface ProjectedPoint {
  week: number;
  mark: number;
  low: number;
  high: number;
}

export interface TrajectoryResult {
  actual: TrajectoryPoint[];
  projected: ProjectedPoint[];
  slopePerWeek: number;
}

const REGRESSION_WINDOW = 6;

/**
 * Builds a rolling linear regression on an athlete's logged marks and extends
 * it forward as a projection with a +/-1 stddev confidence band.
 */
export function buildTrajectory(logs: WeeklyLog[], weeksAhead: number): TrajectoryResult {
  const logged = logs.filter((l) => l.mark != null) as (WeeklyLog & { mark: number })[];
  const actual = logged.map((l) => ({ week: l.week, mark: l.mark }));

  if (logged.length < 2) {
    return { actual, projected: [], slopePerWeek: 0 };
  }

  const recent = logged.slice(-REGRESSION_WINDOW);
  const xs = recent.map((l) => l.week);
  const ys = recent.map((l) => l.mark);
  const { slope, intercept, stdDev } = linearRegression(xs, ys);

  const lastWeek = logged[logged.length - 1].week;
  const projected: ProjectedPoint[] = [];
  for (let i = 1; i <= weeksAhead; i++) {
    const week = lastWeek + i;
    const projectedMark = slope * week + intercept;
    projected.push({
      week,
      mark: projectedMark,
      low: projectedMark - stdDev,
      high: projectedMark + stdDev,
    });
  }

  return { actual, projected, slopePerWeek: slope };
}

/** Projected range at a specific number of weeks from the last logged result. */
export function projectAtWeek(logs: WeeklyLog[], targetWeek: number): { low: number; high: number; mark: number } | null {
  const logged = logs.filter((l) => l.mark != null) as (WeeklyLog & { mark: number })[];
  if (logged.length < 2) return null;

  const recent = logged.slice(-REGRESSION_WINDOW);
  const xs = recent.map((l) => l.week);
  const ys = recent.map((l) => l.mark);
  const { slope, intercept, stdDev } = linearRegression(xs, ys);

  const mark = slope * targetWeek + intercept;
  return { mark, low: mark - stdDev, high: mark + stdDev };
}
