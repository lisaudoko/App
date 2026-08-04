import type { EventGroup } from '@/lib/formatPerformance';

export type Role = 'coach' | 'athlete';

export type AthleteStatus = 'active' | 'injured' | 'rest' | 'inactive';

export type MarkUnit = 'm' | 's' | 'kg' | 'lbs';

export type { EventGroup } from '@/lib/formatPerformance';

export interface ThrowsConfig {
  qualifyingEventName: string;
  strengthLifts: WorkoutLift[];
  calculationMethod: 'percent_1rm' | 'rpe_based' | 'manual';
}

export interface SprintsConfig {
  qualifyingEventName: string;
  paceZones: { name: string; minPct: number; maxPct: number | null }[];
  repDistances: number[];
  restUnit: 'seconds' | 'minutes';
}

export interface JumpsConfig {
  qualifyingEventName: string;
  trackApproachRuns: boolean;
  trackPlyoLoad: boolean;
  strengthLifts: WorkoutLift[];
}

export interface ProgrammeConfig {
  eventGroups: EventGroup[];
  throws: ThrowsConfig | null;
  sprints: SprintsConfig | null;
  jumps: JumpsConfig | null;
  qualifyingStandards: Record<string, number>;
  competitionDate: string | null;
}

export interface LiftMaxes {
  squat: number;
  clean: number;
  bench: number;
  deadlift: number;
}

export type WorkoutLift = 'squat' | 'clean' | 'bench' | 'deadlift';

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  /** Which 1RM to scale intensity_pct against; null for accessory/bodyweight work. */
  lift: WorkoutLift | null;
  /** Coach-set fixed weight, used instead of the %1RM calculation when present. */
  weightOverride: number | null;
}

export interface Workout {
  weekNumber: number;
  intensityPct: number;
  /** Weight is rounded to the nearest multiple of this (e.g. 5, 2.5). */
  roundingIncrement: number;
  exercises: WorkoutExercise[];
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

export interface Meet {
  id: string;
  name: string;
  date: string;
  standards: Record<string, number>;
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
}

export interface SessionCredentials {
  email: string;
  password: string;
}
