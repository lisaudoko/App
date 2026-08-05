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
  // Only set when the load fails AND there's no cache to fall back on — distinct from a
  // genuinely empty profile, so a cold-start network failure never reads as "no data yet".
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
    } catch (err) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached));
        setIsStale(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load your data');
        throw err;
      }
    }
  }, [athleteId]);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  return { data, loading, isStale, error, refresh: load };
}
