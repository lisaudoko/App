import * as ss from 'npm:simple-statistics@7';

export interface WeeklyLogPoint {
  week_number: number;
  best_throw: number | null;
}

export type ProjectionConfidence = 'high' | 'medium' | 'low';

export interface Projection {
  projected: number;
  lower: number;
  upper: number;
  confidence: ProjectionConfidence;
  slope: number;
}

const REGRESSION_WINDOW = 6;
const CONFIDENCE_Z = 1.64;

/** Mirrors mobile/src/lib/projections.ts — duplicated here since edge functions
 * (Deno) and the app (React Native) are separate runtimes/deploy targets. */
export function projectToWeek(logs: WeeklyLogPoint[], targetWeekNumber: number): Projection | null {
  const logged = logs
    .filter((l): l is { week_number: number; best_throw: number } => l.best_throw != null)
    .sort((a, b) => a.week_number - b.week_number)
    .slice(-REGRESSION_WINDOW);

  if (logged.length < 2) return null;

  const data: [number, number][] = logged.map((l) => [l.week_number, l.best_throw]);
  const { m: slope, b: intercept } = ss.linearRegression(data);
  const line = ss.linearRegressionLine({ m: slope, b: intercept });

  const r2 = ss.rSquared(data, line);
  const residuals = data.map(([x, y]) => y - line(x));
  const residualStdDev = logged.length > 2 ? ss.standardDeviation(residuals) : Math.abs(residuals[0] ?? 0);

  const projected = line(targetWeekNumber);
  const band = CONFIDENCE_Z * residualStdDev;
  const confidence: ProjectionConfidence = r2 > 0.85 ? 'high' : r2 > 0.65 ? 'medium' : 'low';

  return { projected, lower: projected - band, upper: projected + band, confidence, slope };
}
