import { Share } from 'react-native';
import type { Workout } from '@/data/types';

export interface ShareableExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
}

/** Formats a week's plan as plain text and opens the native share sheet (email, messages, save to files, etc). */
export async function shareWorkout(title: string, workout: Workout, exercises: ShareableExercise[]): Promise<void> {
  const lines = [
    title,
    `Week ${workout.weekNumber} · ${Math.round(workout.intensityPct * 100)}% intensity`,
    '',
    ...exercises.map((ex) => `${ex.name} — ${ex.sets} x ${ex.reps}${ex.weight != null ? ` @ ${ex.weight} lbs` : ''}`),
  ];
  try {
    await Share.share({ message: lines.join('\n'), title });
  } catch {
    // user cancelled or share sheet failed — nothing to recover
  }
}
