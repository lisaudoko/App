export type Role = 'coach' | 'athlete';

export type AthleteStatus = 'active' | 'injured' | 'rest' | 'inactive';

export type MarkUnit = 'm' | 's' | 'kg' | 'lbs';

export interface LiftMaxes {
  squat: number;
  clean: number;
  bench: number;
}

export interface Athlete {
  id: string;
  userId: string;
  name: string;
  event: string;
  secondaryEvent?: string;
  group: string;
  status: AthleteStatus;
  unit: MarkUnit;
  baselineMark: number;
  personalBest: number;
  currentMaxes: LiftMaxes;
  targetMaxes: LiftMaxes;
  qualifyingStandard: number;
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
