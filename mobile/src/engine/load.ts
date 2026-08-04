import type { WeeklyLog } from '@/data/types';
import { mean } from './stats';

export type LoadStatus = 'ok' | 'high' | 'low' | 'missing';

export interface WeekLoadInfo {
  week: number;
  label: string;
  rpe: number | null;
  status: LoadStatus;
}

/** Acute (last week) vs chronic (rolling 4-week average) load ratio. >1.3 = overreaching risk. */
export function acuteChronicRatio(logs: WeeklyLog[]): number | null {
  const logged = logs.filter((l) => l.volumeLoad != null) as (WeeklyLog & { volumeLoad: number })[];
  if (logged.length < 2) return null;

  const acute = logged[logged.length - 1].volumeLoad;
  const chronicWindow = logged.slice(-4);
  const chronic = mean(chronicWindow.map((l) => l.volumeLoad));
  if (chronic === 0) return null;
  return acute / chronic;
}

/** The programme's current week: the highest week_number logged by anyone. */
export function currentWeekFromLogs(weeklyLogsByAthlete: Record<string, WeeklyLog[]>): number {
  let max = 0;
  for (const logs of Object.values(weeklyLogsByAthlete)) {
    for (const l of logs) if (l.week > max) max = l.week;
  }
  return max;
}

const RPE_THRESHOLD = 8;

/**
 * Squad RPE heatmap row data for the trailing `weeks` weeks up to
 * `currentWeek`, filling in "missing" cells for weeks with no logged row —
 * un-logged weeks have no row at all, so gaps can't be found by slicing.
 */
export function buildRpeRow(logs: WeeklyLog[], weeks: number, currentWeek: number): WeekLoadInfo[] {
  const byWeek = new Map(logs.map((l) => [l.week, l]));
  const startWeek = Math.max(1, currentWeek - weeks + 1);
  const out: WeekLoadInfo[] = [];
  for (let week = startWeek; week <= currentWeek; week++) {
    const log = byWeek.get(week);
    let status: LoadStatus = 'missing';
    if (log?.rpe != null) {
      status = log.rpe >= RPE_THRESHOLD ? 'high' : log.rpe >= RPE_THRESHOLD - 2 ? 'ok' : 'low';
    }
    out.push({ week, label: log?.label ?? `W${week}`, rpe: log?.rpe ?? null, status });
  }
  return out;
}
