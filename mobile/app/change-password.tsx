import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { repository } from '@/data/repository';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

/** In-session password change, reachable either voluntarily from Settings, or forced on
 *  first login for a coach-created athlete account (session.mustChangePassword) — the
 *  athlete tabs layout redirects here until it's cleared. Reuses the same
 *  `supabase.auth.updateUser({ password })` call reset-password.tsx already uses after a
 *  successful email-link exchange; here there's already a live session, so no exchange step
 *  is needed. */
export default function ChangePasswordScreen() {
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const forced = session?.mustChangePassword ?? false;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      if (forced && session) {
        await repository.updateProfile(session.id, { mustChangePassword: false });
      }
      await useAuthStore.getState().restoreSession();
      if (forced) router.replace('/');
      else router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSaving(false);
    }
  }

  const passwordsMatch = password === confirmPassword;
  const canSubmit = password.length >= 6 && passwordsMatch;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {forced ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>Set your password</Text>
        </View>
      ) : (
        <ScreenHeader title="Change password" onBack={() => router.back()} />
      )}
      <Screen>
        {forced && (
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
            Your coach set a temporary password for you. Choose your own before continuing.
          </Text>
        )}

        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          textContentType="newPassword"
          autoComplete="password-new"
          placeholder="At least 6 characters"
        />
        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          revealable
          textContentType="newPassword"
          autoComplete="password-new"
          placeholder="Re-enter your password"
          error={confirmPassword.length > 0 && !passwordsMatch ? "Passwords don't match" : undefined}
        />

        {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}

        <Button label="Update password" onPress={handleSave} loading={saving} disabled={!canSubmit} />

        {!forced && (
          <Text
            style={{ fontSize: 13, color: colors.accent, marginTop: 16, textAlign: 'center' }}
            onPress={() => router.push('/forgot-password')}
          >
            Forgot your password instead? Reset via email
          </Text>
        )}
      </Screen>
    </SafeAreaView>
  );
}
