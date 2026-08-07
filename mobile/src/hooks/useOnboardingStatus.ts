import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { repository } from '@/data/repository';

/** Coach-only: true once the programme has at least one event group configured. */
export function useOnboardingStatus() {
  const coachId = useAuthStore((s) => (s.session?.role === 'coach' ? s.session.id : undefined));
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!coachId) {
      setNeedsOnboarding(false);
      return;
    }
    try {
      const config = await repository.getProgrammeConfig();
      setNeedsOnboarding(!config || config.eventGroups.length === 0);
      setError(null);
    } catch (err) {
      // Leaves needsOnboarding at its last-known value rather than guessing — surfaced via
      // `error` so a caller can retry rather than silently mis-routing on a failed check.
      setError(err instanceof Error ? err.message : 'Could not check onboarding status');
    }
  }, [coachId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { needsOnboarding, loading, error, refresh };
}
