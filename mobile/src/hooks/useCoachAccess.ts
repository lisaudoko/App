import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getCoachAccess, type CoachAccess } from '@/lib/subscription';

const DEFAULT_ACCESS: CoachAccess = { hasAccess: true, tier: null, isTrialing: false, daysLeft: null, athleteLimit: Infinity };

/** Coach-only subscription access status — always full access for non-coach sessions. */
export function useCoachAccess() {
  const coachId = useAuthStore((s) => (s.session?.role === 'coach' ? s.session.id : undefined));
  const [access, setAccess] = useState<CoachAccess>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!coachId) {
      setAccess(DEFAULT_ACCESS);
      return;
    }
    try {
      const result = await getCoachAccess(coachId);
      setAccess(result);
      setError(null);
    } catch (err) {
      // Leaves `access` at its last-known value — surfaced via `error` so a caller can
      // retry rather than this failing silently and the gate never updating.
      setError(err instanceof Error ? err.message : 'Could not check subscription access');
    }
  }, [coachId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { access, loading, error, refresh };
}
