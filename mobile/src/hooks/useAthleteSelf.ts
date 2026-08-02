import { useCallback, useEffect, useState } from 'react';
import { repository } from '@/data/repository';
import { useAuthStore } from '@/store/authStore';
import type { Athlete, Meet, StrengthTest, WeeklyLog } from '@/data/types';

interface AthleteSelfData {
  athlete: Athlete | null;
  logs: WeeklyLog[];
  tests: StrengthTest[];
  meets: Meet[];
  mesocycleWeek: number;
}

const EMPTY: AthleteSelfData = { athlete: null, logs: [], tests: [], meets: [], mesocycleWeek: 1 };

export function useAthleteSelf() {
  const athleteId = useAuthStore((s) => s.session?.athleteId);
  const [data, setData] = useState<AthleteSelfData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!athleteId) {
      setData(EMPTY);
      return;
    }
    const [athlete, logs, tests, meets, mesocycleWeek] = await Promise.all([
      repository.getAthlete(athleteId),
      repository.getWeeklyLogs(athleteId),
      repository.getStrengthTests(athleteId),
      repository.getMeets(),
      repository.getMesocycleWeek(),
    ]);
    setData({ athlete: athlete ?? null, logs, tests, meets, mesocycleWeek });
  }, [athleteId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return { data, loading, refresh: load };
}
