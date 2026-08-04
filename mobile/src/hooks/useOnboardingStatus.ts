import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { repository } from '@/data/repository';

/** Coach-only: true once the programme has at least one event group configured. */
export function useOnboardingStatus() {
  const coachId = useAuthStore((s) => (s.session?.role === 'coach' ? s.session.id : undefined));
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!coachId) {
      setNeedsOnboarding(false);
      return;
    }
    const config = await repository.getProgrammeConfig();
    setNeedsOnboarding(!config || config.eventGroups.length === 0);
  }, [coachId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { needsOnboarding, loading, refresh };
}
