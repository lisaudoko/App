import type { Athlete, StrengthTest, WeeklyLog } from '@/data/types';
import { EVENT_GROUP_DIRECTION } from '@/lib/formatPerformance';
import { pearsonCorrelation, mean } from './stats';
import { weekBucket } from '@/lib/weekBuckets';

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
  // For sprints (lower_better), a shrinking mark is improvement, not decline — comparing
  // marks[last] < marks[0] directly (without direction) flagged improving sprinters as
  // disengaging and never caught ones who were actually getting slower.
  const direction = EVENT_GROUP_DIRECTION[athlete.eventGroup ?? 'throws'];
  const trendDown = direction === 'higher_better' ? marks[marks.length - 1] < marks[0] : marks[marks.length - 1] > marks[0];

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

function missingLogStreak(athlete: Athlete, logs: WeeklyLog[], currentBucket: number): Anomaly | null {
  // An athlete's week_number is just their own log count, so gaps are found by log DATE against the
  // current calendar week. Flags two full weeks with nothing (this week doesn't count against them
  // yet — on a Monday nobody has logged). An athlete who has never logged isn't flagged here: there's
  // no way to tell a new joiner from a no-show, and they already show as "No log".
  const loggedBuckets = new Set(
    logs.filter((l) => (l.mark != null || l.rpe != null) && l.loggedAt).map((l) => weekBucket(l.loggedAt as string)),
  );
  if (loggedBuckets.size === 0) return null;
  if (!loggedBuckets.has(currentBucket) && !loggedBuckets.has(currentBucket - 1) && !loggedBuckets.has(currentBucket - 2)) {
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      severity: 'danger',
      message: 'No log for 2+ weeks — attendance risk.',
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

export function detectAnomalies(athlete: Athlete, logs: WeeklyLog[], tests: StrengthTest[], currentBucket: number): Anomaly[] {
  return [
    strengthVsThrowFlat(athlete, logs, tests),
    disengagementRisk(athlete, logs),
    missingLogStreak(athlete, logs, currentBucket),
    overreachRisk(athlete, logs),
  ].filter((a): a is Anomaly => a !== null);
}
