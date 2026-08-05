import React, { useRef, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
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
      <Screen>
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350 }}>
            <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
              <Image
                source={require('../assets/logo.png')}
                style={{ width: 140, height: 158, borderRadius: 16 }}
                resizeMode="contain"
                accessibilityLabel="TRU Performance"
              />
            </View>

            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) clearError();
              }}
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
              onChangeText={(t) => {
                setPassword(t);
                if (error) clearError();
              }}
              secureTextEntry
              revealable
              textContentType="password"
              autoComplete="password"
              placeholder="••••••••"
              returnKeyType="go"
              onSubmitEditing={() => handleLogin()}
            />

            {error && (
              <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>
            )}

            <Button label="Log in" onPress={() => handleLogin()} loading={isBusy} disabled={!email || !password} />

            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <Link href="/forgot-password" style={{ fontSize: 15, color: colors.textMuted }}>
                Forgot password?
              </Link>
            </View>

            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 15, color: colors.textMuted }}>
                Don&apos;t have an account?{' '}
                <Link href="/signup" style={{ color: colors.text, fontWeight: '600' }}>
                  Sign up
                </Link>
              </Text>
            </View>
          </MotiView>
      </Screen>
    </SafeAreaView>
  );
}
