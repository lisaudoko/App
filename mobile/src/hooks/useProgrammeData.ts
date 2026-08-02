import { useCallback, useEffect, useState } from 'react';
import { repository } from '@/data/repository';
import type { Athlete, Meet, AppNotification, StrengthTest, WeeklyLog } from '@/data/types';

export interface ProgrammeData {
  athletes: Athlete[];
  weeklyLogs: Record<string, WeeklyLog[]>;
  strengthTests: Record<string, StrengthTest[]>;
  meets: Meet[];
  notifications: AppNotification[];
}

const EMPTY: ProgrammeData = { athletes: [], weeklyLogs: {}, strengthTests: {}, meets: [], notifications: [] };

/** Loads the full mock programme dataset once, with a refetch for pull-to-refresh. */
export function useProgrammeData() {
  const [data, setData] = useState<ProgrammeData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [ctx, notifications] = await Promise.all([repository.getFullContext(), repository.getNotifications()]);
    setData({ ...ctx, notifications });
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return { data, loading, refresh: load };
}
