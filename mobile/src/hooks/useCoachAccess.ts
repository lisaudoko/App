import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getCoachAccess, type CoachAccess } from '@/lib/subscription';

const DEFAULT_ACCESS: CoachAccess = { hasAccess: true, tier: null, isTrialing: false, daysLeft: null, athleteLimit: Infinity };

/** Coach-only subscription access status — always full access for non-coach sessions. */
export function useCoachAccess() {
  const coachId = useAuthStore((s) => (s.session?.role === 'coach' ? s.session.id : undefined));
  const [access, setAccess] = useState<CoachAccess>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!coachId) {
      setAccess(DEFAULT_ACCESS);
      return;
    }
    const result = await getCoachAccess(coachId);
    setAccess(result);
  }, [coachId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { access, loading, refresh };
}
