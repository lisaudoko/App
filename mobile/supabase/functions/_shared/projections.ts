import * as ss from 'npm:simple-statistics@7';

export type Direction = 'higher_better' | 'lower_better';

export interface WeeklyLogPoint {
  week_number: number;
  performance: number | null;
}

export type ProjectionConfidence = 'high' | 'medium' | 'low';

export interface Projection {
  projected: number;
  lower: number;
  upper: number;
  confidence: ProjectionConfidence;
  slope: number;
  direction: Direction;
}

const REGRESSION_WINDOW = 6;
const CONFIDENCE_Z = 1.64;

/** Mirrors mobile/src/lib/projections.ts — duplicated here since edge functions
 * (Deno) and the app (React Native) are separate runtimes/deploy targets. */
export function projectToWeek(
  logs: WeeklyLogPoint[],
  targetWeekNumber: number,
  direction: Direction = 'higher_better',
): Projection | null {
  const logged = logs
    .filter((l): l is { week_number: number; performance: number } => l.performance != null)
    .sort((a, b) => a.week_number - b.week_number)
    .slice(-REGRESSION_WINDOW);

  if (logged.length < 2) return null;

  const data: [number, number][] = logged.map((l) => [l.week_number, l.performance]);
  const { m: slope, b: intercept } = ss.linearRegression(data);
  const line = ss.linearRegressionLine({ m: slope, b: intercept });

  const r2 = ss.rSquared(data, line);
  const residuals = data.map(([x, y]) => y - line(x));
  const residualStdDev = logged.length > 2 ? ss.standardDeviation(residuals) : Math.abs(residuals[0] ?? 0);

  const projected = line(targetWeekNumber);
  const band = CONFIDENCE_Z * residualStdDev;
  const confidence: ProjectionConfidence = r2 > 0.85 ? 'high' : r2 > 0.65 ? 'medium' : 'low';

  return { projected, lower: projected - band, upper: projected + band, confidence, slope, direction };
}

/** Positive = still needs improvement to reach the standard, negative = already ahead. */
export function computeGap(current: number, standard: number, direction: Direction): number {
  return direction === 'higher_better' ? standard - current : current - standard;
}

/** True if `a` is a better performance than `b` for the given direction. */
export function isBetter(a: number, b: number, direction: Direction): boolean {
  return direction === 'higher_better' ? a > b : a < b;
}

/** Mirrors mobile/src/lib/formatPerformance.ts's formatPerformance(). */
export function formatPerformance(value: number, unit: 'metres' | 'seconds'): string {
  if (unit === 'metres') return `${value.toFixed(2)}m`;
  if (value < 60) return `${value.toFixed(2)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}
