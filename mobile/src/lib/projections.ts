import * as ss from 'simple-statistics';
import type { Direction } from './formatPerformance';

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
const CONFIDENCE_Z = 1.64; // ~90% band

/**
 * Linear-regresses an athlete's last 6 logged performances and projects
 * forward to `targetWeekNumber` (e.g. a competition week). Returns null if
 * there isn't enough logged data (fewer than 2 marks) to fit a line.
 *
 * The regression itself (slope, r², residual spread) is symmetric — it fits
 * a line to whatever numbers it's given, whether those numbers trend up
 * (throws/jumps distance) or down (sprint times). `direction` isn't used in
 * the math; it's threaded through onto the result so callers can correctly
 * interpret the projection against a qualifying standard (see
 * lib/formatPerformance.ts's computeGap/isBetter) without having to
 * separately track which sport an athlete is in.
 */
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
  // ss.standardDeviation needs >=2 points; guaranteed by the length check above.
  const residualStdDev = logged.length > 2 ? ss.standardDeviation(residuals) : Math.abs(residuals[0] ?? 0);

  const projected = line(targetWeekNumber);
  const band = CONFIDENCE_Z * residualStdDev;

  const confidence: ProjectionConfidence = r2 > 0.85 ? 'high' : r2 > 0.65 ? 'medium' : 'low';

  return {
    projected,
    lower: projected - band,
    upper: projected + band,
    confidence,
    slope,
    direction,
  };
}
