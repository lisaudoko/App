import type { WeeklyLog } from '@/data/types';
import { projectToWeek, type ProjectionConfidence } from '@/lib/projections';
import type { Direction } from '@/lib/formatPerformance';

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
  direction: Direction;
}

const PROJECTION_HORIZON_WEEKS = 12;

/**
 * Builds a trajectory (actual + forward projection) for chart rendering,
 * backed by the spec's simple-statistics regression in lib/projections.ts.
 */
export function buildTrajectory(logs: WeeklyLog[], weeksAhead: number, direction: Direction = 'higher_better'): TrajectoryResult {
  const logged = logs.filter((l) => l.mark != null) as (WeeklyLog & { mark: number })[];
  const actual = logged.map((l) => ({ week: l.week, mark: l.mark }));

  if (logged.length < 2) {
    return { actual, projected: [], slopePerWeek: 0, direction };
  }

  const points = logged.map((l) => ({ week_number: l.week, performance: l.mark }));
  const lastWeek = logged[logged.length - 1].week;
  const first = projectToWeek(points, lastWeek + 1, direction);
  if (!first) return { actual, projected: [], slopePerWeek: 0, direction };

  const projected: ProjectedPoint[] = [];
  for (let i = 1; i <= weeksAhead; i++) {
    const week = lastWeek + i;
    const p = projectToWeek(points, week, direction);
    if (!p) continue;
    projected.push({ week, mark: p.projected, low: p.lower, high: p.upper });
  }

  return { actual, projected, slopePerWeek: first.slope, direction };
}

/** Projected range at a specific week number, e.g. a competition/deadline week. */
export function projectAtWeek(
  logs: WeeklyLog[],
  targetWeek: number,
  direction: Direction = 'higher_better',
): { low: number; high: number; mark: number; confidence: ProjectionConfidence; direction: Direction } | null {
  const points = logs
    .filter((l) => l.mark != null)
    .map((l) => ({ week_number: l.week, performance: l.mark as number }));
  const p = projectToWeek(points, targetWeek, direction);
  if (!p) return null;
  return { mark: p.projected, low: p.lower, high: p.upper, confidence: p.confidence, direction: p.direction };
}

export { PROJECTION_HORIZON_WEEKS };
