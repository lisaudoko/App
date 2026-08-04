import type { BlockExercise, LiftMaxes } from '@/data/types';
import { inferLiftForExercise } from '@/data/workoutBlocks';

export function roundToIncrement(value: number, increment: number): number {
  if (!increment) return Math.round(value);
  return Math.round(value / increment) * increment;
}

/** Coach-set fixed weight wins; otherwise pctOfMax × the inferred 1RM, rounded to the configured increment. */
export function computeExerciseWeight(
  exercise: BlockExercise,
  roundingIncrement: number,
  maxes: LiftMaxes,
): number | null {
  if (exercise.weightLbs != null) return exercise.weightLbs;
  if (exercise.pctOfMax == null) return null;
  const lift = inferLiftForExercise(exercise.name);
  if (!lift) return null;
  return roundToIncrement(exercise.pctOfMax * maxes[lift], roundingIncrement);
}
