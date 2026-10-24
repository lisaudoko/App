import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface TabLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TourRole = 'coach' | 'athlete';

interface TourState {
  /** Per-role "has seen the first-run walkthrough" flags. `completed` is the coach flag, kept under
   *  its original name so an already-persisted value still applies. */
  completed: boolean;
  athleteCompleted: boolean;
  /** Which role's tour is currently being shown (first-run walkthrough or manual replay); null = none. */
  activeRole: TourRole | null;
  stepIndex: number;
  /** Window-space position of each tab bar button, reported by TourMeasuredButton
   *  as it mounts/relayouts, so AppTour can cut a spotlight hole out of its overlay. */
  tabLayouts: Partial<Record<string, TabLayout>>;
  hasHydrated: boolean;
  /** Starts the tour from the first stop — "Replay app tour" in Settings (coach) or Profile (athlete).
   *  The argument is checked rather than typed `TourRole` because Settings passes this straight to onPress. */
  replay: (role?: unknown) => void;
  next: () => void;
  back: () => void;
  finish: () => void;
  reportTabLayout: (key: string, layout: TabLayout) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      completed: false,
      athleteCompleted: false,
      activeRole: null,
      stepIndex: 0,
      tabLayouts: {},
      hasHydrated: false,
      replay: (role) => set({ activeRole: role === 'athlete' ? 'athlete' : 'coach', stepIndex: 0 }),
      next: () => set((s) => ({ stepIndex: s.stepIndex + 1 })),
      back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
      finish: () =>
        set((s) => ({
          activeRole: null,
          completed: s.activeRole === 'coach' ? true : s.completed,
          athleteCompleted: s.activeRole === 'athlete' ? true : s.athleteCompleted,
        })),
      reportTabLayout: (key, layout) => set((s) => ({ tabLayouts: { ...s.tabLayouts, [key]: layout } })),
    }),
    {
      name: 'tru.tour.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ completed: state.completed, athleteCompleted: state.athleteCompleted }),
      onRehydrateStorage: () => () => {
        // First-run auto-start now happens in AppTour once it mounts for the signed-in role, since which
        // tour to show depends on who is logged in — hydration only flags that the saved flags are loaded.
        useTourStore.setState({ hasHydrated: true });
      },
    },
  ),
);
