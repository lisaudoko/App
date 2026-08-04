import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { LoadingState } from '@/components/LoadingState';

export default function ResetPasswordScreen() {
  const { colors } = useAppTheme();
  const { code, error: linkError } = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  const [verifying, setVerifying] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (linkError || !code) {
        setVerifying(false);
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      setLinkValid(!exchangeError);
      setVerifying(false);
    }
    verify();
  }, [code, linkError]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await useAuthStore.getState().restoreSession();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSaving(false);
    }
  }

  const passwordsMatch = password === confirmPassword;
  const canSubmit = password.length >= 6 && passwordsMatch;

  if (verifying) return <LoadingState />;

  if (!linkValid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>⚠️</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
            This link has expired
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            Password reset links only work once and expire after a while. Request a new one.
          </Text>
          <Button label="Request a new link" onPress={() => router.replace('/forgot-password')} />
          <Button label="Back to login" variant="outline" onPress={() => router.replace('/login')} />
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4 }}>
          Set a new password
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20 }}>
          Choose a new password for your account.
        </Text>

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
      </Screen>
    </SafeAreaView>
  );
}
