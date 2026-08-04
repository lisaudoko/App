import { blockColors } from '@/theme/colors';
import type { BlockExercise, BlockType, EventGroup, WorkoutLift } from './types';

export interface BlockTypeDef {
  type: BlockType;
  /** Distinguishes same-type blocks with different exercise pools across event groups (e.g. Plyometrics for throws vs jumps). */
  group: EventGroup;
  label: string;
  color: string;
  textColor: string;
  exercises: string[];
  /** Which BlockExercise fields the builder/athlete-view should show for this block type. */
  fields: (keyof BlockExercise)[];
}

// Fields shown as "duration_minutes" in the spec are stored in timeSeconds (×60).
const WARM_COOL_FIELDS: (keyof BlockExercise)[] = ['timeSeconds', 'notes'];
const LIFT_FIELDS: (keyof BlockExercise)[] = ['sets', 'repsPattern', 'pctOfMax', 'weightLbs', 'restSeconds'];
const PLYO_FIELDS: (keyof BlockExercise)[] = ['sets', 'repsPattern', 'distanceMetres', 'restSeconds'];
const CORE_FIELDS: (keyof BlockExercise)[] = ['sets', 'repsPattern', 'timeSeconds'];
const MED_BALL_FIELDS: (keyof BlockExercise)[] = ['sets', 'repsPattern', 'notes'];
const DRILL_FIELDS: (keyof BlockExercise)[] = ['sets', 'repsPattern', 'distanceMetres', 'coachingCue'];
const SPEED_FIELDS: (keyof BlockExercise)[] = ['distanceMetres', 'repsPattern', 'intensityPct', 'restSeconds'];
const JUMP_REPS_FIELDS: (keyof BlockExercise)[] = ['repsPattern', 'coachingCue', 'notes'];

const OLYMPIC_LIFTS = ['Floor Cleans', 'Hang Cleans', 'Floor Snatch', 'Hang Snatch', 'Clean Hi Pull', 'Snatch Pull', 'Hip Cleans', 'Hip Snatch'];
const WEIGHTLIFTING = [
  'Bench Press', 'Wide Bench', 'Incline Bench', 'Front Press', 'Back Press', 'DB Shoulder Press',
  'Back Squats', 'Front Squats', 'Split Squats', 'Leg Press', 'Leg Extension', 'Leg Curl', 'RDL', 'Deadlift', 'Lunges',
  'Front Squat to Press', 'Squat to Back Press', 'Overhead Squats',
];
const JUMPS_STRENGTH = ['Squats', 'Cleans', 'RDL', 'Nordic Curls', 'SL Squats'];
const CORE_GLUTES = ['Plank', 'Dead Bug', 'Russian Twist', 'Bicycles', 'Fire Hydrants', 'Hip Circles', 'Heel to Ceiling', 'Glute Bridge', 'Reverse Crunch', 'V-Ups', 'Scissors', 'Superman'];
const WARM_UP_GENERAL = ['Jog', 'A-skips', 'B-skips', 'High Knees', 'Butt Kicks', 'Dynamic Stretching'];

export const EVENT_GROUP_BLOCKS: Record<EventGroup, BlockTypeDef[]> = {
  throws: [
    { type: 'warm_up', group: 'throws', label: 'Warm Up', color: blockColors.warmUp.bg, textColor: blockColors.warmUp.text, exercises: ['Skipping', ...WARM_UP_GENERAL], fields: WARM_COOL_FIELDS },
    { type: 'olympic_lifts', group: 'throws', label: 'Olympic Lifts', color: blockColors.olympic.bg, textColor: blockColors.olympic.text, exercises: OLYMPIC_LIFTS, fields: LIFT_FIELDS },
    { type: 'weightlifting', group: 'throws', label: 'Weightlifting', color: blockColors.weights.bg, textColor: blockColors.weights.text, exercises: WEIGHTLIFTING, fields: LIFT_FIELDS },
    { type: 'plyometrics', group: 'throws', label: 'Plyometrics', color: blockColors.plyo.bg, textColor: blockColors.plyo.text, exercises: ['Explosive Harvards', 'Frog Jumps', 'Hop Hop Jump', 'Speed Skater', 'Split Jumps', 'Tuck Jumps', 'SL Squat Jumps', 'Star Jumps', 'Box Jumps'], fields: PLYO_FIELDS },
    { type: 'core_glutes', group: 'throws', label: 'Core & Glutes', color: blockColors.core.bg, textColor: blockColors.core.text, exercises: CORE_GLUTES, fields: CORE_FIELDS },
    { type: 'med_ball_mobility', group: 'throws', label: 'Med Ball & Mobility', color: blockColors.medBall.bg, textColor: blockColors.medBall.text, exercises: ['MBM Over Under', 'Upper Twist', 'Reverse Twist', 'Hi/Lo', 'Hurdle Mobility'], fields: MED_BALL_FIELDS },
    { type: 'technical_drills', group: 'throws', label: 'Technical Drills & Throws', color: blockColors.technical.bg, textColor: blockColors.technical.text, exercises: ['Ball Throws', 'Stands', 'Step Turns', 'Half Turns', 'Full Turns'], fields: DRILL_FIELDS },
    { type: 'conditioning', group: 'throws', label: 'Conditioning', color: blockColors.throws.bg, textColor: blockColors.throws.text, exercises: ['Short Sprints'], fields: SPEED_FIELDS },
    { type: 'cool_down', group: 'throws', label: 'Cool Down', color: blockColors.coolDown.bg, textColor: blockColors.coolDown.text, exercises: ['Static Stretching'], fields: WARM_COOL_FIELDS },
  ],
  sprints: [
    { type: 'warm_up', group: 'sprints', label: 'Warm Up', color: blockColors.warmUp.bg, textColor: blockColors.warmUp.text, exercises: WARM_UP_GENERAL, fields: WARM_COOL_FIELDS },
    { type: 'technical_drills', group: 'sprints', label: 'Technical Drills', color: blockColors.technical.bg, textColor: blockColors.technical.text, exercises: ['Wall Drills', 'Wickets', 'Block Starts', 'Bounding', 'Ankling', 'Fast Leg', 'Acceleration Drills'], fields: DRILL_FIELDS },
    { type: 'speed_work', group: 'sprints', label: 'Speed Work', color: blockColors.sprints.bg, textColor: blockColors.sprints.text, exercises: ['Max Effort Sprints'], fields: SPEED_FIELDS },
    { type: 'speed_endurance', group: 'sprints', label: 'Speed Endurance', color: blockColors.sprints.bg, textColor: blockColors.sprints.text, exercises: ['Speed Endurance Runs'], fields: SPEED_FIELDS },
    { type: 'tempo', group: 'sprints', label: 'Tempo', color: blockColors.sprints.bg, textColor: blockColors.sprints.text, exercises: ['Tempo Runs'], fields: SPEED_FIELDS },
    { type: 'strength', group: 'sprints', label: 'Strength', color: blockColors.weights.bg, textColor: blockColors.weights.text, exercises: [...OLYMPIC_LIFTS, ...WEIGHTLIFTING], fields: LIFT_FIELDS },
    { type: 'core_glutes', group: 'sprints', label: 'Core', color: blockColors.core.bg, textColor: blockColors.core.text, exercises: CORE_GLUTES, fields: CORE_FIELDS },
    { type: 'cool_down', group: 'sprints', label: 'Cool Down', color: blockColors.coolDown.bg, textColor: blockColors.coolDown.text, exercises: ['Static Stretching'], fields: WARM_COOL_FIELDS },
  ],
  jumps: [
    { type: 'warm_up', group: 'jumps', label: 'Warm Up', color: blockColors.warmUp.bg, textColor: blockColors.warmUp.text, exercises: WARM_UP_GENERAL, fields: WARM_COOL_FIELDS },
    { type: 'technical_drills', group: 'jumps', label: 'Technical Drills', color: blockColors.technical.bg, textColor: blockColors.technical.text, exercises: ['Approach Run Rehearsal', 'Take-off Drills', 'Penultimate Step', 'Pop Drills', 'Step Counting', 'Sand Pit Approach'], fields: DRILL_FIELDS },
    { type: 'plyometrics', group: 'jumps', label: 'Plyometrics', color: blockColors.plyo.bg, textColor: blockColors.plyo.text, exercises: ['Bounding', 'Hurdle Hops', 'Box Jumps', 'Depth Jumps', 'SL Hops', 'Triple Jump Bounds', 'Ankle Hops'], fields: PLYO_FIELDS },
    { type: 'jump_reps', group: 'jumps', label: 'Jump Reps', color: blockColors.throws.bg, textColor: blockColors.throws.text, exercises: ['Competition-Style Attempts'], fields: JUMP_REPS_FIELDS },
    { type: 'strength', group: 'jumps', label: 'Strength', color: blockColors.weights.bg, textColor: blockColors.weights.text, exercises: JUMPS_STRENGTH, fields: LIFT_FIELDS },
    { type: 'core_glutes', group: 'jumps', label: 'Core & Glutes', color: blockColors.core.bg, textColor: blockColors.core.text, exercises: CORE_GLUTES, fields: CORE_FIELDS },
    { type: 'cool_down', group: 'jumps', label: 'Cool Down', color: blockColors.coolDown.bg, textColor: blockColors.coolDown.text, exercises: ['Static Stretching'], fields: WARM_COOL_FIELDS },
  ],
};

/** Block types that are identical (same exercise pool) across every group they appear in — safe to dedupe when a coach runs multiple event groups. */
const SHARED_ACROSS_GROUPS: BlockType[] = ['warm_up', 'cool_down'];

/** Block choices for a coach's active event groups, deduped where the exercise pool is identical and disambiguated by group label otherwise. */
export function blockChoicesForGroups(groups: EventGroup[]): (BlockTypeDef & { key: string; displayLabel: string })[] {
  const active = groups.length ? groups : (['throws'] as EventGroup[]);
  const seen = new Map<string, BlockTypeDef & { key: string; displayLabel: string }>();
  for (const group of active) {
    for (const def of EVENT_GROUP_BLOCKS[group]) {
      const dedupeKey = SHARED_ACROSS_GROUPS.includes(def.type) ? def.type : `${def.type}:${group}`;
      if (seen.has(dedupeKey)) continue;
      const needsSuffix = active.length > 1 && !SHARED_ACROSS_GROUPS.includes(def.type);
      seen.set(dedupeKey, { ...def, key: dedupeKey, displayLabel: needsSuffix ? `${def.label} (${group})` : def.label });
    }
  }
  return Array.from(seen.values());
}

export function blockTypeDef(type: BlockType, group: EventGroup): BlockTypeDef | undefined {
  return EVENT_GROUP_BLOCKS[group]?.find((d) => d.type === type) ?? Object.values(EVENT_GROUP_BLOCKS).flat().find((d) => d.type === type);
}

/** Best-effort exercise name -> tracked 1RM lookup, used only for weightlifting/olympic/strength blocks. */
const LIFT_NAME_MAP: Record<string, WorkoutLift> = {
  'floor cleans': 'clean', 'hang cleans': 'clean', 'floor snatch': 'clean', 'hang snatch': 'clean',
  'clean hi pull': 'clean', 'snatch pull': 'clean', 'hip cleans': 'clean', 'hip snatch': 'clean', cleans: 'clean',
  'power clean': 'clean', 'clean': 'clean',
  'bench press': 'bench', 'wide bench': 'bench', 'incline bench': 'bench', 'front press': 'bench', 'back press': 'bench', 'db shoulder press': 'bench',
  'back squats': 'squat', 'back squat': 'squat', 'front squats': 'squat', 'front squat': 'squat', 'split squats': 'squat',
  'leg press': 'squat', 'leg extension': 'squat', 'leg curl': 'squat',
  'front squat to press': 'squat', 'squat to back press': 'squat', 'overhead squats': 'squat', squats: 'squat', 'sl squats': 'squat', lunges: 'squat',
  rdl: 'deadlift', deadlift: 'deadlift',
};

export function inferLiftForExercise(name: string): WorkoutLift | null {
  return LIFT_NAME_MAP[name.trim().toLowerCase()] ?? null;
}
