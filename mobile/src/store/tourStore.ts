import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface TabLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourState {
  completed: boolean;
  /** Tour is currently being shown — either the first-run walkthrough or a manual replay. */
  active: boolean;
  stepIndex: number;
  /** Window-space position of each coach tab bar button, reported by TourMeasuredButton
   *  as it mounts/relayouts, so AppTour can cut a spotlight hole out of its overlay. */
  tabLayouts: Partial<Record<string, TabLayout>>;
  hasHydrated: boolean;
  /** Restarts the tour from the first stop — used by "Replay app tour" in Settings. */
  replay: () => void;
  next: () => void;
  back: () => void;
  finish: () => void;
  reportTabLayout: (key: string, layout: TabLayout) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      completed: false,
      active: false,
      stepIndex: 0,
      tabLayouts: {},
      hasHydrated: false,
      replay: () => set({ active: true, stepIndex: 0 }),
      next: () => set((s) => ({ stepIndex: s.stepIndex + 1 })),
      back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
      finish: () => set({ active: false, completed: true }),
      reportTabLayout: (key, layout) => set((s) => ({ tabLayouts: { ...s.tabLayouts, [key]: layout } })),
    }),
    {
      name: 'tru.tour.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ completed: state.completed }),
      onRehydrateStorage: () => (state) => {
        // A brand-new install has no persisted `completed` — auto-start the walkthrough once
        // hydration confirms that. An existing user who already dismissed it stays untouched
        // until they hit "Replay app tour" in Settings.
        useTourStore.setState({ hasHydrated: true, active: !state?.completed });
      },
    },
  ),
);
