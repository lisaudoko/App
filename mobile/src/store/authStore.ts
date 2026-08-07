import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { registerPushToken, clearPushToken } from '@/lib/notifications';
import { identifyRevenueCatUser, signOutRevenueCat } from '@/lib/revenuecat';
import { startTrialIfNeeded } from '@/lib/subscription';
import { edgeFunctionErrorMessage } from '@/lib/edgeFunctionError';
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

function onSessionEstablished(account: UserAccount): void {
  registerPushToken(account.id).catch(() => {});
  identifyRevenueCatUser(account.id).catch(() => {});
  if (account.role === 'coach') startTrialIfNeeded().catch(() => {});
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
          onSessionEstablished(account);
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
          onSessionEstablished(account);
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
            .insert({ name: input.programmeName, created_by: signUpData.user.id })
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
          onSessionEstablished(account);
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

          const [{ data: limit }, { data: count }] = await Promise.all([
            supabase.rpc('programme_athlete_limit', { target_programme_id: programmeId }),
            supabase.rpc('programme_athlete_count', { target_programme_id: programmeId }),
          ]);
          if (limit != null && count != null && count >= limit) {
            throw new AuthError("This programme has reached its athlete limit. Ask your coach to upgrade their plan.");
          }

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
          onSessionEstablished(account);
        } catch (e) {
          const authError = mapAuthError(e);
          set({ isBusy: false, error: authError.message });
          throw authError;
        }
      },

      logout: async () => {
        const { session } = get();
        if (session) clearPushToken(session.id).catch(() => {});
        await signOutRevenueCat();
        await supabase.auth.signOut();
        set({ session: null, error: null });
      },

      deleteAccount: async () => {
        const { session } = get();
        if (!session) return;
        set({ isBusy: true });
        // Runs server-side with the service role: deletes the auth user, which
        // cascades to profiles/weekly_logs/strength_logs/notifications_log.
        const { error } = await supabase.functions.invoke('delete-account');
        if (error) {
          set({ isBusy: false });
          throw new AuthError(await edgeFunctionErrorMessage(error, 'Could not delete your account'));
        }
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
