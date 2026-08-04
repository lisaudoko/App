import type { Athlete, StrengthTest, WeeklyLog } from '@/data/types';
import { pearsonCorrelation, mean } from './stats';

export interface Anomaly {
  athleteId: string;
  athleteName: string;
  message: string;
  severity: 'warning' | 'danger';
}

function strengthVsThrowFlat(athlete: Athlete, logs: WeeklyLog[], tests: StrengthTest[]): Anomaly | null {
  if (tests.length < 2) return null;
  const squatDelta = tests[tests.length - 1].squat - tests[tests.length - 2].squat;
  const recentMarks = logs.filter((l) => l.mark != null).slice(-4).map((l) => l.mark as number);
  if (recentMarks.length < 4) return null;
  const spread = Math.max(...recentMarks) - Math.min(...recentMarks);

  if (squatDelta >= 4 && spread < 0.3) {
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      severity: 'warning',
      message: `Squat up ${squatDelta.toFixed(0)} but best mark hasn't moved in 4 weeks — possible technique regression.`,
    };
  }
  return null;
}

function disengagementRisk(athlete: Athlete, logs: WeeklyLog[]): Anomaly | null {
  const rpeLogged = logs.filter((l) => l.rpe != null) as (WeeklyLog & { rpe: number })[];
  if (rpeLogged.length < 4) return null;
  const recentRpe = mean(rpeLogged.slice(-3).map((l) => l.rpe));
  const marks = logs.filter((l) => l.mark != null).slice(-3).map((l) => l.mark as number);
  if (marks.length < 3) return null;
  const trendDown = marks[marks.length - 1] < marks[0];

  if (recentRpe < 5.5 && trendDown) {
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      severity: 'warning',
      message: 'RPE trending low while marks are also dropping — possible disengagement.',
    };
  }
  return null;
}

function missingLogStreak(athlete: Athlete, logs: WeeklyLog[], currentWeek: number): Anomaly | null {
  // Rows simply don't exist for un-logged weeks (no null-placeholder rows are
  // stored), so gaps must be detected against the programme's current week
  // rather than by scanning trailing array entries.
  if (currentWeek < 2) return null;
  const loggedWeeks = new Set(logs.filter((l) => l.mark != null || l.rpe != null).map((l) => l.week));
  if (!loggedWeeks.has(currentWeek) && !loggedWeeks.has(currentWeek - 1)) {
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      severity: 'danger',
      message: `No log for weeks ${currentWeek - 1}-${currentWeek} — attendance risk.`,
    };
  }
  return null;
}

function overreachRisk(athlete: Athlete, logs: WeeklyLog[]): Anomaly | null {
  const rpeLogged = logs.filter((l) => l.rpe != null) as (WeeklyLog & { rpe: number })[];
  if (rpeLogged.length < 3) return null;
  const lastThree = rpeLogged.slice(-3).map((l) => l.rpe);
  if (lastThree.every((r) => r >= 8)) {
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      severity: 'danger',
      message: `RPE ${lastThree[lastThree.length - 1]} for 3 straight weeks — reduce volume.`,
    };
  }
  return null;
}

export function detectAnomalies(athlete: Athlete, logs: WeeklyLog[], tests: StrengthTest[], currentWeek: number): Anomaly[] {
  return [
    strengthVsThrowFlat(athlete, logs, tests),
    disengagementRisk(athlete, logs),
    missingLogStreak(athlete, logs, currentWeek),
    overreachRisk(athlete, logs),
  ].filter((a): a is Anomaly => a !== null);
}

export function strengthThrowCorrelation(tests: StrengthTest[], marksAtTestDates: number[]): number {
  if (tests.length < 2 || marksAtTestDates.length !== tests.length) return 0;
  return pearsonCorrelation(tests.map((t) => t.squat), marksAtTestDates);
}
