import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const CACHE_KEY = 'tru.cache.athleteSelf.v1';

export function useAthleteSelf() {
  const athleteId = useAuthStore((s) => s.session?.athleteId);
  const [data, setData] = useState<AthleteSelfData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const load = useCallback(async () => {
    if (!athleteId) {
      setData(EMPTY);
      return;
    }
    try {
      const [athlete, logs, tests, meets, mesocycleWeek] = await Promise.all([
        repository.getAthlete(athleteId),
        repository.getWeeklyLogs(athleteId),
        repository.getStrengthTests(athleteId),
        repository.getMeets(),
        repository.getMesocycleWeek(),
      ]);
      const fresh = { athlete: athlete ?? null, logs, tests, meets, mesocycleWeek };
      setData(fresh);
      setIsStale(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
    } catch (err) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached));
        setIsStale(true);
      } else {
        throw err;
      }
    }
  }, [athleteId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return { data, loading, isStale, refresh: load };
}
