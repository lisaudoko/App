import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getCoachAccess, resolvePlanOwnerId, type CoachAccess } from '@/lib/subscription';

const DEFAULT_ACCESS: CoachAccess = { hasAccess: true, tier: null, isTrialing: false, daysLeft: null, athleteLimit: Infinity };

/**
 * Coach/assistant-coach subscription access status — always full access for
 * athlete sessions. Assistant coaches inherit the head coach's plan (see
 * resolvePlanOwnerId) rather than having any billing identity of their own.
 */
export function useCoachAccess() {
  const session = useAuthStore((s) => (s.session?.role === 'coach' || s.session?.role === 'assistant_coach' ? s.session : undefined));
  const [access, setAccess] = useState<CoachAccess>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setAccess(DEFAULT_ACCESS);
      return;
    }
    try {
      const ownerId = await resolvePlanOwnerId(session.id, session.role);
      const result = await getCoachAccess(ownerId);
      setAccess(result);
      setError(null);
    } catch (err) {
      // Leaves `access` at its last-known value — surfaced via `error` so a caller can
      // retry rather than this failing silently and the gate never updating.
      setError(err instanceof Error ? err.message : 'Could not check subscription access');
    }
  }, [session]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { access, loading, error, refresh };
}
