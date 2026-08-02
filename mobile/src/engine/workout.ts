import type { Athlete } from '@/data/types';
import { MESOCYCLE_INTENSITY, MESOCYCLE_SCHEME } from '@/data/seed';

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface WorkoutCard {
  mesocycleWeek: number;
  intensityPct: number;
  exercises: WorkoutExercise[];
}

const DEADLIFT_RATIO = 1.15;

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

/**
 * Dynamic prescription engine: calculates each exercise's working weight from
 * the athlete's current 1RM maxes and the active mesocycle week's intensity %.
 */
export function generateWorkout(athlete: Athlete, mesocycleWeek: number): WorkoutCard {
  const weekIndex = Math.min(Math.max(mesocycleWeek - 1, 0), MESOCYCLE_INTENSITY.length - 1);
  const intensityPct = MESOCYCLE_INTENSITY[weekIndex];
  const { sets, reps } = MESOCYCLE_SCHEME[weekIndex];
  const { squat, clean, bench } = athlete.currentMaxes;

  const exercises: WorkoutExercise[] = [
    { id: 'squat', name: 'Back Squat', sets, reps, weight: roundToNearest5(squat * intensityPct) },
    { id: 'bench', name: 'Wide Bench', sets, reps, weight: roundToNearest5(bench * intensityPct) },
    { id: 'clean', name: 'Power Clean', sets, reps, weight: roundToNearest5(clean * intensityPct) },
    {
      id: 'deadlift',
      name: 'Deadlift',
      sets: Math.max(sets - 2, 3),
      reps,
      weight: roundToNearest5(squat * DEADLIFT_RATIO * intensityPct),
    },
  ];

  return { mesocycleWeek, intensityPct, exercises };
}
