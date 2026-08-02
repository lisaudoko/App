import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import type { Role } from '@/data/types';

export default function SignupScreen() {
  const { colors } = useAppTheme();
  const signupCoach = useAuthStore((s) => s.signupCoach);
  const signupAthlete = useAuthStore((s) => s.signupAthlete);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [role, setRole] = useState<Role>('coach');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [programmeName, setProgrammeName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [event, setEvent] = useState('');

  async function handleSubmit() {
    clearError();
    try {
      if (role === 'coach') {
        await signupCoach({ name, email, password, programmeName: programmeName || `${name}'s Programme` });
      } else {
        await signupAthlete({ name, email, password, joinCode, event: event || 'Shot Put' });
      }
      router.replace('/');
    } catch {
      // error surfaced via store
    }
  }

  const canSubmit =
    !!name &&
    !!email &&
    password.length >= 6 &&
    (role === 'coach' ? true : !!joinCode);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Screen>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4 }}>
            Create your account
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20 }}>
            One app, two experiences — tell us which one you are.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['coach', 'athlete'] as Role[]).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: role === r ? 0 : 1,
                  borderColor: colors.border,
                  backgroundColor: role === r ? colors.accent : 'transparent',
                }}
              >
                <Text style={{ color: role === r ? colors.accentText : colors.textMuted, fontWeight: '600', textTransform: 'capitalize' }}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField label="Full name" value={name} onChangeText={setName} placeholder="Jane Doe" />
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />

          {role === 'coach' ? (
            <TextField label="Programme name" value={programmeName} onChangeText={setProgrammeName} placeholder="e.g. Kingston AC Throws" />
          ) : (
            <>
              <TextField label="Primary event" value={event} onChangeText={setEvent} placeholder="e.g. Shot Put" />
              <TextField label="Programme join code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" placeholder="Ask your coach" />
            </>
          )}

          {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}

          <Button label="Create account" onPress={handleSubmit} loading={isBusy} disabled={!canSubmit} />

          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: colors.text, fontWeight: '600' }}>
                Log in
              </Link>
            </Text>
          </View>
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
