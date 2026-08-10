import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TourState {
  completed: boolean;
  /** Set by "Replay app tour" in settings — forces the welcome overlay to show
   *  again without touching the persisted `completed` flag below, so it reverts
   *  to hidden the next time the app is opened/signed into. */
  replaying: boolean;
  hasHydrated: boolean;
  dismiss: () => void;
  replay: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      completed: false,
      replaying: false,
      hasHydrated: false,
      dismiss: () => set({ completed: true, replaying: false }),
      replay: () => set({ replaying: true }),
    }),
    {
      name: 'tru.tour.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ completed: state.completed }),
      onRehydrateStorage: () => () => {
        useTourStore.setState({ hasHydrated: true });
      },
    },
  ),
);
