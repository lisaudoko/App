import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AuthError, repository } from '@/data/repository';
import type { UserAccount } from '@/data/types';

interface AuthState {
  session: UserAccount | null;
  hasHydrated: boolean;
  isBusy: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signupCoach: (input: { name: string; email: string; password: string; programmeName: string }) => Promise<void>;
  signupAthlete: (input: { name: string; email: string; password: string; joinCode: string; event: string }) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      hasHydrated: false,
      isBusy: false,
      error: null,

      login: async (email, password) => {
        set({ isBusy: true, error: null });
        try {
          const account = await repository.login(email, password);
          set({ session: account, isBusy: false });
        } catch (e) {
          set({ isBusy: false, error: e instanceof AuthError ? e.message : 'Something went wrong. Try again.' });
          throw e;
        }
      },

      signupCoach: async (input) => {
        set({ isBusy: true, error: null });
        try {
          const account = await repository.signupCoach(input);
          set({ session: account, isBusy: false });
        } catch (e) {
          set({ isBusy: false, error: e instanceof AuthError ? e.message : 'Something went wrong. Try again.' });
          throw e;
        }
      },

      signupAthlete: async (input) => {
        set({ isBusy: true, error: null });
        try {
          const account = await repository.signupAthlete(input);
          set({ session: account, isBusy: false });
        } catch (e) {
          set({ isBusy: false, error: e instanceof AuthError ? e.message : 'Something went wrong. Try again.' });
          throw e;
        }
      },

      logout: () => set({ session: null, error: null }),

      deleteAccount: async () => {
        const { session } = get();
        if (!session) return;
        set({ isBusy: true });
        await repository.deleteAccount(session.id);
        set({ session: null, isBusy: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tru.auth.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
