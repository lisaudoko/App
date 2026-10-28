import type { WeeklyLog } from '@/data/types';
import { mean } from './stats';
import { weekBucket, weekBucketLabel } from '@/lib/weekBuckets';

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

const RPE_THRESHOLD = 8;

/**
 * Squad RPE heatmap row data for the trailing `weeks` calendar weeks up to `currentBucket`
 * (see lib/weekBuckets), filling in "missing" cells for weeks with no logged row. Columns are real
 * calendar weeks rather than each athlete's own log count, so every athlete lines up in the same column.
 */
export function buildRpeRow(logs: WeeklyLog[], weeks: number, currentBucket: number): WeekLoadInfo[] {
  const byWeek = new Map<number, WeeklyLog>();
  for (const l of logs) if (l.loggedAt) byWeek.set(weekBucket(l.loggedAt), l);
  const startWeek = currentBucket - weeks + 1;
  const out: WeekLoadInfo[] = [];
  for (let week = startWeek; week <= currentBucket; week++) {
    const log = byWeek.get(week);
    let status: LoadStatus = 'missing';
    if (log?.rpe != null) {
      status = log.rpe >= RPE_THRESHOLD ? 'high' : log.rpe >= RPE_THRESHOLD - 2 ? 'ok' : 'low';
    }
    out.push({ week, label: weekBucketLabel(week), rpe: log?.rpe ?? null, status });
  }
  return out;
}
