import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { repository } from '@/data/repository';
import { supabase } from '@/lib/supabase';
import type { Athlete, Meet, AppNotification, StrengthTest, WeeklyLog } from '@/data/types';

export interface ProgrammeData {
  athletes: Athlete[];
  weeklyLogs: Record<string, WeeklyLog[]>;
  strengthTests: Record<string, StrengthTest[]>;
  meets: Meet[];
  notifications: AppNotification[];
}

const EMPTY: ProgrammeData = { athletes: [], weeklyLogs: {}, strengthTests: {}, meets: [], notifications: [] };
const CACHE_KEY = 'tru.cache.programmeData.v1';

/** Loads the coach's squad data, with realtime updates and an offline cache fallback. */
export function useProgrammeData() {
  const [data, setData] = useState<ProgrammeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const programmeIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ctx, notifications] = await Promise.all([repository.getFullContext(), repository.getNotifications()]);
      const fresh = { ...ctx, notifications };
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
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    repository.getMyProgrammeId().then((programmeId) => {
      if (cancelled || !programmeId) return;
      programmeIdRef.current = programmeId;
      channel = supabase
        .channel(`programme-${programmeId}-weekly-logs`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'weekly_logs', filter: `programme_id=eq.${programmeId}` },
          () => load(),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  return { data, loading, isStale, refresh: load };
}
