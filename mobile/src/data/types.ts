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
}

export interface SessionCredentials {
  email: string;
  password: string;
}
