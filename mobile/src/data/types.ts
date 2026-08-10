import type { EventGroup } from '@/lib/formatPerformance';

export type Role = 'coach' | 'assistant_coach' | 'athlete';

export const ROLE_LABEL: Record<Role, string> = {
  coach: 'Coach',
  assistant_coach: 'Assistant Coach',
  athlete: 'Athlete',
};

export type AthleteStatus = 'active' | 'injured' | 'rest' | 'inactive';

export const ATHLETE_STATUS_LABEL: Record<AthleteStatus, string> = {
  active: 'Active',
  injured: 'Injured',
  rest: 'Rest',
  inactive: 'Inactive',
};

export type Sex = 'male' | 'female';

export const SEX_LABEL: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
};

/** Common athlete classifications — a starting point, not exhaustive; the field itself is free text
 *  since class/category terminology varies by federation and country. */
export const CLASS_CATEGORY_PRESETS = ['Open', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'U20', 'U18', 'U16'];

export type MarkUnit = 'm' | 's' | 'kg' | 'lbs';

export type { EventGroup } from '@/lib/formatPerformance';

export interface ThrowsConfig {
  strengthLifts: WorkoutLift[];
  calculationMethod: 'percent_1rm' | 'rpe_based' | 'manual';
}

export interface SprintsConfig {
  paceZones: { name: string; minPct: number; maxPct: number | null }[];
  repDistances: number[];
  restUnit: 'seconds' | 'minutes';
}

export interface JumpsConfig {
  trackApproachRuns: boolean;
  trackPlyoLoad: boolean;
  strengthLifts: WorkoutLift[];
}

export interface ProgrammeConfig {
  eventGroups: EventGroup[];
  throws: ThrowsConfig | null;
  sprints: SprintsConfig | null;
  jumps: JumpsConfig | null;
  competitionDate: string | null;
  /** Monday of training week 1 — anchors week_number to real calendar dates for the Calendar
   *  screen. Null until the coach sets it (programmes that existed before this feature shipped). */
  seasonStartDate: string | null;
}

export interface LiftMaxes {
  squat: number;
  clean: number;
  bench: number;
  deadlift: number;
}

export type WorkoutLift = 'squat' | 'clean' | 'bench' | 'deadlift';

export type BlockType =
  | 'warm_up'
  | 'olympic_lifts'
  | 'weightlifting'
  | 'strength'
  | 'plyometrics'
  | 'core_glutes'
  | 'med_ball_mobility'
  | 'technical_drills'
  | 'conditioning'
  | 'speed_work'
  | 'speed_endurance'
  | 'tempo'
  | 'jump_reps'
  | 'cool_down';

export interface BlockExercise {
  id: string;
  name: string;
  category: string | null;
  sets: number | null;
  repsPattern: string | null;
  pctOfMax: number | null;
  weightLbs: number | null;
  distanceMetres: number | null;
  intensityPct: number | null;
  restSeconds: number | null;
  timeSeconds: number | null;
  coachingCue: string | null;
  notes: string | null;
}

export interface WorkoutBlock {
  id: string;
  type: BlockType;
  label: string;
  order: number;
  exercises: BlockExercise[];
  /** 1 (Mon) – 7 (Sun), or null for a "general" block that applies every day of the week
   *  (also the value for blocks saved before per-day scheduling existed). */
  day: number | null;
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
/** JS Date#getDay() is 0 (Sun) – 6 (Sat); WorkoutBlock.day is 1 (Mon) – 7 (Sun). */
export function todayAsWorkoutDay(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export interface Workout {
  weekNumber: number;
  intensityPct: number;
  /** Weight is rounded to the nearest multiple of this (e.g. 5, 2.5). */
  roundingIncrement: number;
  blocks: WorkoutBlock[];
}

export interface Athlete {
  id: string;
  userId: string;
  name: string;
  event: string;
  eventGroup: EventGroup | null;
  secondaryEvent?: string;
  group: string;
  status: AthleteStatus;
  unit: MarkUnit;
  baselineMark: number;
  personalBest: number;
  currentMaxes: LiftMaxes;
  targetMaxes: LiftMaxes;
  qualifyingStandard: number;
  qualifyingEvent: string;
  dateOfBirth: string | null;
  /** Free text (e.g. "Open", "Class 1", "U20") — terminology varies by federation/country. */
  classCategory: string | null;
  sex: Sex | null;
  joinedAt: string;
}

export interface WeeklyLog {
  week: number;
  label: string;
  mark: number | null;
  rpe: number | null;
  volumeLoad: number | null;
  sleep: number | null;
  soreness: number | null;
  energy: number | null;
  motivation: number | null;
  bodyWeight: number | null;
  isCompetition: boolean;
  meetName?: string;
  loggedAt: string | null;
}

export interface StrengthTest {
  date: string;
  label: string;
  squat: number;
  clean: number;
  bench: number;
  deadlift: number;
}

export type MeetType = 'qualifier' | 'championship' | 'invitational' | 'dual_meet' | 'time_trial';

export interface Meet {
  id: string;
  name: string;
  date: string;
  standards: Record<string, number>;
  location: string | null;
  meetType: MeetType | null;
  conditions: string | null;
  generalNotes: string | null;
  completed: boolean;
}

export interface MeetAttempt {
  attempt: number;
  mark: number | null;
  wind: string | null;
  foul: boolean;
  notes: string;
}

export interface MeetEntry {
  id: string;
  meetId: string;
  athleteId: string;
  event: string;
  bibNumber: string | null;
  seedMark: number | null;
  attempts: MeetAttempt[];
  finalMark: number | null;
  place: number | null;
  qualified: boolean;
  /** null for athletes — these three columns are coach-private and excluded from the athlete-facing view. */
  coachNotes: string | null;
  technicalCues: string | null;
  nextSteps: string | null;
  createdAt: string;
}

export type NoteType = 'general' | 'injury' | 'technical' | 'mindset' | 'admin';

export interface AthleteNote {
  id: string;
  programmeId: string;
  athleteId: string;
  coachId: string;
  noteDate: string;
  noteType: NoteType;
  body: string;
  flagFollowup: boolean;
  createdAt: string;
}

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  athleteId?: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  programmeName: string;
  athleteId?: string;
  /** Set on coach-created athlete accounts (coach chooses the initial password) — forces a
   *  change-password prompt on first login, cleared once the athlete sets their own. */
  mustChangePassword: boolean;
}

export interface SessionCredentials {
  email: string;
  password: string;
}
