import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { MotiView } from 'moti';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const login = useAuthStore((s) => s.login);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

  async function handleLogin(overrideEmail?: string, overridePassword?: string) {
    clearError();
    try {
      await login(overrideEmail ?? email, overridePassword ?? password);
      router.replace('/');
    } catch {
      // error surfaced via store
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Screen>
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
            <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: colors.text }}>TRU Performance</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Coaching intelligence platform</Text>
            </View>

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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TextField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              revealable
              textContentType="password"
              autoComplete="password"
              placeholder="••••••••"
              returnKeyType="go"
              onSubmitEditing={() => handleLogin()}
            />

            {error && (
              <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>
            )}

            <Button label="Log in" onPress={() => handleLogin()} loading={isBusy} disabled={!email || !password} />

            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Don&apos;t have an account?{' '}
                <Link href="/signup" style={{ color: colors.text, fontWeight: '600' }}>
                  Sign up
                </Link>
              </Text>
            </View>

            <View style={{ marginTop: 40, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
              <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 8, textAlign: 'center' }}>Demo accounts</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Demo Coach"
                    variant="outline"
                    onPress={() => {
                      setEmail('coach@tru.app');
                      setPassword('password123');
                      handleLogin('coach@tru.app', 'password123');
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Demo Athlete"
                    variant="outline"
                    onPress={() => {
                      setEmail('marcus@tru.app');
                      setPassword('password123');
                      handleLogin('marcus@tru.app', 'password123');
                    }}
                  />
                </View>
              </View>
            </View>
          </MotiView>
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
