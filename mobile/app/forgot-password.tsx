import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'truperformance://reset-password',
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Reset password" onBack={() => router.back()} />
      <Screen>
        {sent ? (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>📬</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
              Check your email
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
              If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password.
            </Text>
            <Button label="Back to login" onPress={() => router.replace('/login')} />
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
              Enter the email you signed up with and we&apos;ll send you a link to reset your password.
            </Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="you@example.com"
            />
            {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}
            <Button label="Send reset link" onPress={handleSend} loading={busy} disabled={!email.trim()} />
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
