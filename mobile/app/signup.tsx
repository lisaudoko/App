import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { LoadingState } from '@/components/LoadingState';
import { useScrollToInput } from '@/hooks/useScrollToInput';
import { SEX_LABEL, type Role, type Sex } from '@/data/types';

export default function SignupScreen() {
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  if (inviteToken) return <AcceptInviteScreen token={inviteToken} />;
  return <SelfSignupScreen />;
}

function SelfSignupScreen() {
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [programmeName, setProgrammeName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [event, setEvent] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const programmeNameRef = useRef<TextInput>(null);
  const eventRef = useRef<TextInput>(null);
  const joinCodeRef = useRef<TextInput>(null);
  const { scrollRef, scrollToInput } = useScrollToInput();

  const passwordsMatch = password === confirmPassword;

  async function handleSubmit() {
    clearError();
    try {
      if (role === 'coach') {
        await signupCoach({ name, email, password, programmeName: programmeName || `${name}'s Programme` });
      } else {
        await signupAthlete({ name, email, password, joinCode, event, sex: sex ?? undefined });
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
    passwordsMatch &&
    agreedToTerms &&
    (role === 'coach' ? true : !!joinCode && !!event);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scrollRef={scrollRef}>
          <Text style={{ fontSize: 25, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4 }}>
            Create your account
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 20 }}>
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
                  paddingHorizontal: 8,
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

          <TextField
            ref={nameRef}
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="First Last"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            onFocus={() => scrollToInput(nameRef)}
            blurOnSubmit={false}
          />
          <TextField
            ref={emailRef}
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
            onFocus={() => scrollToInput(emailRef)}
            blurOnSubmit={false}
          />
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            revealable
            textContentType="newPassword"
            autoComplete="password-new"
            placeholder="At least 6 characters"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            onFocus={() => scrollToInput(passwordRef)}
            blurOnSubmit={false}
          />
          <TextField
            ref={confirmPasswordRef}
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            revealable
            textContentType="newPassword"
            autoComplete="password-new"
            placeholder="Re-enter your password"
            returnKeyType={role === 'coach' ? 'done' : 'next'}
            onFocus={() => scrollToInput(confirmPasswordRef)}
            error={confirmPassword.length > 0 && !passwordsMatch ? "Passwords don't match" : undefined}
          />

          {role === 'coach' ? (
            <TextField
              ref={programmeNameRef}
              label="Programme name"
              value={programmeName}
              onChangeText={setProgrammeName}
              placeholder="e.g. Kingston AC Throws"
              onFocus={() => scrollToInput(programmeNameRef)}
            />
          ) : (
            <>
              <TextField
                ref={eventRef}
                label="Primary event"
                value={event}
                onChangeText={setEvent}
                placeholder="e.g. Shot Put"
                onFocus={() => scrollToInput(eventRef)}
              />
              <TextField
                ref={joinCodeRef}
                label="Team code"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                placeholder="Ask your coach"
                onFocus={() => scrollToInput(joinCodeRef)}
              />

              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>Sex (optional)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['male', 'female'] as Sex[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSex((current) => (current === s ? null : s))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sex === s }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      borderWidth: sex === s ? 0 : 1,
                      borderColor: colors.border,
                      backgroundColor: sex === s ? colors.accent : 'transparent',
                    }}
                  >
                    <Text style={{ color: sex === s ? colors.accentText : colors.textMuted, fontWeight: '600' }}>{SEX_LABEL[s]}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable
            onPress={() => setAgreedToTerms((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
            accessibilityLabel="I am 13 years of age or older, and I agree to the Terms of Service and Privacy Policy"
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4, marginBottom: 16 }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                marginTop: 1,
                borderRadius: 4,
                borderWidth: agreedToTerms ? 0 : 1.5,
                borderColor: colors.border,
                backgroundColor: agreedToTerms ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreedToTerms && <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1, lineHeight: 16 }}>
              I am 13 years of age or older, and I agree to the{' '}
              <Link href="/terms" style={{ color: colors.text, fontWeight: '600' }}>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" style={{ color: colors.text, fontWeight: '600' }}>
                Privacy Policy
              </Link>
              . Under 13? Ask your coach to add you instead.
            </Text>
          </Pressable>

          {error && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>}

          <Button label="Create account" onPress={handleSubmit} loading={isBusy} disabled={!canSubmit} />

          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: colors.text, fontWeight: '600' }}>
                Log in
              </Link>
            </Text>
          </View>
      </Screen>
    </SafeAreaView>
  );
}

interface ResolvedInvite {
  email: string;
  programmeName: string;
}

function AcceptInviteScreen({ token }: { token: string }) {
  const { colors } = useAppTheme();
  const acceptAssistantCoachInvite = useAuthStore((s) => s.acceptAssistantCoachInvite);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [resolving, setResolving] = useState(true);
  const [invite, setInvite] = useState<ResolvedInvite | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const nameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const { scrollRef, scrollToInput } = useScrollToInput();

  useEffect(() => {
    async function resolve() {
      const { data } = await supabase.rpc('resolve_coach_invite', { p_token: token });
      const row = data?.[0];
      if (row) setInvite({ email: row.email, programmeName: row.programme_name });
      setResolving(false);
    }
    resolve();
  }, [token]);

  const passwordsMatch = password === confirmPassword;
  const canSubmit = !!name && password.length >= 6 && passwordsMatch;

  async function handleSubmit() {
    clearError();
    try {
      await acceptAssistantCoachInvite({ token, name, password });
      router.replace('/');
    } catch {
      // error surfaced via store
    }
  }

  if (resolving) return <LoadingState />;

  if (!invite) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>⚠️</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
            This invite link is no longer valid
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            It may have already been used or revoked. Ask your head coach to send a new one.
          </Text>
          <Button label="Back to login" variant="outline" onPress={() => router.replace('/login')} />
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scrollRef={scrollRef}>
        <Text style={{ fontSize: 25, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4 }}>
          Join {invite.programmeName}
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 20 }}>
          You&apos;ve been invited as an assistant coach. Set up your account to get started.
        </Text>

        <TextField label="Email" value={invite.email} editable={false} />
        <TextField
          ref={nameRef}
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="First Last"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          onFocus={() => scrollToInput(nameRef)}
          blurOnSubmit={false}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          textContentType="newPassword"
          autoComplete="password-new"
          placeholder="At least 6 characters"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          onFocus={() => scrollToInput(passwordRef)}
          blurOnSubmit={false}
        />
        <TextField
          ref={confirmPasswordRef}
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          revealable
          textContentType="newPassword"
          autoComplete="password-new"
          placeholder="Re-enter your password"
          returnKeyType="done"
          onFocus={() => scrollToInput(confirmPasswordRef)}
          error={confirmPassword.length > 0 && !passwordsMatch ? "Passwords don't match" : undefined}
        />

        {error && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>}

        <Button label="Join as assistant coach" onPress={handleSubmit} loading={isBusy} disabled={!canSubmit} />
      </Screen>
    </SafeAreaView>
  );
}
