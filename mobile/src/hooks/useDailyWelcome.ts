import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';

const STORAGE_PREFIX = 'tru.welcome.lastShown.';

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** "Welcome back, {name}" text shown once per calendar day per user, then null again. */
export function useDailyWelcome(): string | null {
  const session = useAuthStore((s) => s.session);
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const today = new Date().toDateString();
    const key = STORAGE_PREFIX + session.id;
    let cancelled = false;
    AsyncStorage.getItem(key).then((lastShown) => {
      if (cancelled || lastShown === today) return;
      setGreeting(`Welcome back, ${firstName(session.name)}`);
      AsyncStorage.setItem(key, today).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!greeting) return;
    const timer = setTimeout(() => setGreeting(null), 4000);
    return () => clearTimeout(timer);
  }, [greeting]);

  return greeting;
}
