import type { LiftMaxes, WorkoutExercise } from '@/data/types';

export function roundToIncrement(value: number, increment: number): number {
  if (!increment) return Math.round(value);
  return Math.round(value / increment) * increment;
}

/** Coach-set fixed weight wins; otherwise intensity% × the mapped 1RM, rounded to the configured increment. */
export function computeExerciseWeight(
  exercise: WorkoutExercise,
  intensityPct: number,
  roundingIncrement: number,
  maxes: LiftMaxes,
): number | null {
  if (exercise.weightOverride != null) return exercise.weightOverride;
  if (!exercise.lift) return null;
  return roundToIncrement(intensityPct * maxes[exercise.lift], roundingIncrement);
}
