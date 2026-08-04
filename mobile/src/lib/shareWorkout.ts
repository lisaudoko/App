import { Share } from 'react-native';
import type { BlockExercise, EventGroup, LiftMaxes, Workout, WorkoutBlock } from '@/data/types';
import { blockTypeDef, inferLiftForExercise } from '@/data/workoutBlocks';
import { roundToIncrement } from '@/engine/workoutWeight';

function describeForExport(ex: BlockExercise, blockType: WorkoutBlock['type'], roundingIncrement: number, maxes: LiftMaxes | null): string {
  const isDuration = blockType === 'warm_up' || blockType === 'cool_down';
  const parts: string[] = [];

  if (blockType === 'olympic_lifts' || blockType === 'weightlifting' || blockType === 'strength') {
    if (ex.sets != null) parts.push(`${ex.sets} sets`);
    if (ex.repsPattern) parts.push(ex.repsPattern);
    let weight = ex.weightLbs;
    if (weight == null && ex.pctOfMax != null && maxes) {
      const lift = inferLiftForExercise(ex.name);
      if (lift) weight = roundToIncrement(ex.pctOfMax * maxes[lift], roundingIncrement);
    }
    if (weight != null) parts.push(`@ ${weight} lbs`);
    else if (ex.pctOfMax != null) parts.push(`@ ${Math.round(ex.pctOfMax * 100)}%`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
  } else if (blockType === 'speed_work' || blockType === 'speed_endurance' || blockType === 'tempo' || blockType === 'conditioning') {
    const reps = ex.repsPattern ? `${ex.repsPattern} ×` : null;
    const dist = ex.distanceMetres != null ? `${ex.distanceMetres}m` : null;
    if (reps || dist) parts.push([reps, dist].filter(Boolean).join(' '));
    if (ex.intensityPct != null) parts.push(`@ ${Math.round(ex.intensityPct * 100)}%`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
  } else if (blockType === 'core_glutes') {
    if (ex.sets != null) parts.push(ex.timeSeconds != null ? `${ex.sets} × ${ex.timeSeconds}s` : `${ex.sets} × ${ex.repsPattern ?? ''}`.trim());
  } else if (blockType === 'plyometrics') {
    const reps = ex.repsPattern ? `${ex.sets != null ? `${ex.sets} × ` : ''}${ex.repsPattern}` : null;
    if (reps) parts.push(reps);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
  } else if (isDuration) {
    if (ex.timeSeconds != null) parts.push(`${Math.round(ex.timeSeconds / 60)} min`);
  } else if (blockType === 'jump_reps') {
    if (ex.repsPattern) parts.push(`${ex.repsPattern} reps`);
  } else if (blockType === 'technical_drills') {
    if (ex.sets != null && ex.repsPattern) parts.push(`${ex.sets} × ${ex.repsPattern}`);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
  } else {
    if (ex.sets != null) parts.push(`${ex.sets} ×`);
    if (ex.repsPattern) parts.push(ex.repsPattern);
  }

  const line = parts.filter(Boolean).join(' · ');
  const cue = ex.coachingCue ? ` (${ex.coachingCue})` : '';
  return `${ex.name}${line ? ` — ${line}` : ''}${cue}`;
}

/** Formats a week's plan as plain text and opens the native share sheet (email, messages, save to files, etc). */
export async function shareWorkout(title: string, workout: Workout, group: EventGroup, maxes: LiftMaxes | null): Promise<void> {
  const lines = [title, `Week ${workout.weekNumber} · ${Math.round(workout.intensityPct * 100)}% intensity`, ''];

  for (const block of [...workout.blocks].sort((a, b) => a.order - b.order)) {
    if (block.exercises.length === 0) continue;
    const def = blockTypeDef(block.type, group);
    lines.push(`${block.label || def?.label || block.type}:`);
    for (const ex of block.exercises) {
      lines.push(`  ${describeForExport(ex, block.type, workout.roundingIncrement, maxes)}`);
    }
    lines.push('');
  }

  try {
    await Share.share({ message: lines.join('\n').trim(), title });
  } catch {
    // user cancelled or share sheet failed — nothing to recover
  }
}
