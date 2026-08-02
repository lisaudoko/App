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

const RPE_THRESHOLD = 8;

/** Squad RPE heatmap row data for the last N weeks, including gaps for un-logged weeks. */
export function buildRpeRow(logs: WeeklyLog[], weeks: number): WeekLoadInfo[] {
  const tail = logs.slice(-weeks);
  return tail.map((l) => {
    let status: LoadStatus = 'missing';
    if (l.rpe != null) {
      status = l.rpe >= RPE_THRESHOLD ? 'high' : l.rpe >= RPE_THRESHOLD - 2 ? 'ok' : 'low';
    }
    return { week: l.week, label: l.label, rpe: l.rpe, status };
  });
}
