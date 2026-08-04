import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { registerPushToken, clearPushToken } from '@/lib/notifications';
import type { UserAccount } from '@/data/types';

export class AuthError extends Error {}

interface AuthState {
  session: UserAccount | null;
  hasHydrated: boolean;
  isBusy: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signupCoach: (input: { name: string; email: string; password: string; programmeName: string }) => Promise<void>;
  signupAthlete: (input: {
    name: string;
    email: string;
    password: string;
    joinCode: string;
    event: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
  /** Called once from the root layout to sync with Supabase's own persisted session. */
  restoreSession: () => Promise<void>;
}

async function accountFromProfile(userId: string, email: string): Promise<UserAccount> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, programme_id')
    .eq('id', userId)
    .single();
  if (error || !profile) throw new AuthError('No profile found for this account.');

  let programmeName = '';
  if (profile.programme_id) {
    const { data: programme } = await supabase.from('programmes').select('name').eq('id', profile.programme_id).single();
    programmeName = programme?.name ?? '';
  }

  return {
    id: profile.id,
    name: profile.full_name,
    email,
    role: profile.role as UserAccount['role'],
    programmeName,
    athleteId: profile.role === 'athlete' ? profile.id : undefined,
  };
}

function mapAuthError(err: unknown): AuthError {
  const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
  return new AuthError(message);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      hasHydrated: false,
      isBusy: false,
      error: null,

      restoreSession: async () => {
        try {
          const {
            data: { session: supabaseSession },
          } = await supabase.auth.getSession();
          if (!supabaseSession) {
            set({ session: null });
            return;
          }
          const account = await accountFromProfile(supabaseSession.user.id, supabaseSession.user.email ?? '');
          set({ session: account });
          registerPushToken(account.id).catch(() => {});
        } catch {
          set({ session: null });
        } finally {
          set({ hasHydrated: true });
        }

        supabase.auth.onAuthStateChange((_event, supabaseSession) => {
          if (!supabaseSession) {
            set({ session: null });
          }
        });
      },

      login: async (email, password) => {
        set({ isBusy: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error || !data.user) throw error ?? new Error('Incorrect email or password.');
          const account = await accountFromProfile(data.user.id, data.user.email ?? email);
          set({ session: account, isBusy: false });
          registerPushToken(account.id).catch(() => {});
        } catch (e) {
          const authError = mapAuthError(e);
          set({ isBusy: false, error: authError.message });
          throw authError;
        }
      },

      signupCoach: async (input) => {
        set({ isBusy: true, error: null });
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: input.email.trim(),
            password: input.password,
          });
          if (signUpError || !signUpData.user) throw signUpError ?? new Error('Could not create account.');
          if (!signUpData.session) {
            throw new AuthError('Check your email to confirm your account, then log in.');
          }

          const { data: programme, error: programmeError } = await supabase
            .from('programmes')
            .insert({ name: input.programmeName })
            .select()
            .single();
          if (programmeError || !programme) throw programmeError ?? new Error('Could not create programme.');

          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            programme_id: programme.id,
            role: 'coach',
            full_name: input.name,
          });
          if (profileError) throw profileError;

          const account = await accountFromProfile(signUpData.user.id, input.email);
          set({ session: account, isBusy: false });
          registerPushToken(account.id).catch(() => {});
        } catch (e) {
          const authError = mapAuthError(e);
          set({ isBusy: false, error: authError.message });
          throw authError;
        }
      },

      signupAthlete: async (input) => {
        set({ isBusy: true, error: null });
        try {
          const { data: programmeId, error: joinCodeError } = await supabase.rpc('programme_id_for_join_code', {
            code: input.joinCode,
          });
          if (joinCodeError || !programmeId) throw new AuthError('Invalid programme join code.');

          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: input.email.trim(),
            password: input.password,
          });
          if (signUpError || !signUpData.user) throw signUpError ?? new Error('Could not create account.');
          if (!signUpData.session) {
            throw new AuthError('Check your email to confirm your account, then log in.');
          }

          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            programme_id: programmeId,
            role: 'athlete',
            full_name: input.name,
            event: input.event,
            qualifying_event: input.event,
          });
          if (profileError) throw profileError;

          const account = await accountFromProfile(signUpData.user.id, input.email);
          set({ session: account, isBusy: false });
          registerPushToken(account.id).catch(() => {});
        } catch (e) {
          const authError = mapAuthError(e);
          set({ isBusy: false, error: authError.message });
          throw authError;
        }
      },

      logout: async () => {
        const { session } = get();
        if (session) clearPushToken(session.id).catch(() => {});
        await supabase.auth.signOut();
        set({ session: null, error: null });
      },

      deleteAccount: async () => {
        const { session } = get();
        if (!session) return;
        set({ isBusy: true });
        // Deletes the profile row (cascades weekly_logs/strength_logs/notifications_log).
        // Fully removing the auth.users row requires the service-role admin API,
        // which must run server-side — out of scope for the client.
        await supabase.from('profiles').delete().eq('id', session.id);
        await supabase.auth.signOut();
        set({ session: null, isBusy: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tru.auth.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => () => {
        // hasHydrated is set true by restoreSession() once the real Supabase
        // session has been checked — the persisted `session` above is only a
        // fast paint hint, not the source of truth.
        useAuthStore.getState().restoreSession();
      },
    },
  ),
);
