export type WeightUnit = 'lbs' | 'kg';

const LBS_PER_KG = 2.20462262;

/** Weights are stored in lbs everywhere in the database; these convert at the display/input edge only. */
export function lbsToDisplay(lbs: number, unit: WeightUnit): number {
  if (unit === 'lbs') return Math.round(lbs * 10) / 10;
  return Math.round((lbs / LBS_PER_KG) * 10) / 10;
}

/** Prescribed training loads read better in plate-friendly steps: whole lbs, or the nearest 0.5 kg. */
export function lbsToPrescribedDisplay(lbs: number, unit: WeightUnit): number {
  if (unit === 'lbs') return Math.round(lbs);
  return Math.round((lbs / LBS_PER_KG) * 2) / 2;
}

export function displayToLbs(value: number, unit: WeightUnit): number {
  if (unit === 'lbs') return value;
  return Math.round(value * LBS_PER_KG * 100) / 100;
}

/** Whole-number display for a stored lbs value, e.g. 315 lbs → "143" kg. */
export function formatWeight(lbs: number, unit: WeightUnit): string {
  const v = lbsToDisplay(lbs, unit);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
