import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { repository } from '@/data/repository';
import { useCoachAccess } from '@/hooks/useCoachAccess';
import { EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';

const TIER_LABEL: Record<string, string> = { starter: 'Starter', growth: 'Growth', pro: 'Pro' };

export default function AddAthleteScreen() {
  const { colors } = useAppTheme();
  const { access } = useCoachAccess();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [event, setEvent] = useState('');
  const [programmeEventGroups, setProgrammeEventGroups] = useState<EventGroup[]>([]);
  const [eventGroup, setEventGroup] = useState<EventGroup | null>(null);
  const [baselineMark, setBaselineMark] = useState('');
  const [qualifyingStandard, setQualifyingStandard] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    repository.getProgrammeConfig().then((config) => {
      const groups = config?.eventGroups ?? [];
      setProgrammeEventGroups(groups);
      if (groups.length === 1) setEventGroup(groups[0]);
    });
  }, []);

  const canSubmit = !!name && !!email && password.length >= 6 && !!eventGroup && hasPermission;

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      const programmeId = await repository.getMyProgrammeId();
      if (programmeId) {
        const [{ data: limit }, { data: count }] = await Promise.all([
          supabase.rpc('programme_athlete_limit', { target_programme_id: programmeId }),
          supabase.rpc('programme_athlete_count', { target_programme_id: programmeId }),
        ]);
        if (limit != null && count != null && count >= limit) {
          setBusy(false);
          setLimitModalVisible(true);
          return;
        }
      }

      if (!eventGroup) throw new Error('Select an event group');
      await repository.addAthlete({
        name,
        email: email.trim(),
        password,
        event,
        eventGroup,
        baselineMark: baselineMark ? parseFloat(baselineMark) : undefined,
        qualifyingStandard: qualifyingStandard ? parseFloat(qualifyingStandard) : undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add athlete');
    } finally {
      setBusy(false);
    }
  }

  function credentialsMessage() {
    return `You've been added to TRU Performance.\n\nEmail: ${email.trim()}\nTemporary password: ${password}\n\nSign in with these at the app, then change your password from Settings.`;
  }

  async function handleCopyCredentials() {
    await Clipboard.setStringAsync(credentialsMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareCredentials() {
    try {
      await Share.share({ message: credentialsMessage() });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Add athlete" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(coach)/(tabs)'))} />
        <Screen style={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
          <Text style={{ fontSize: 50, textAlign: 'center' }}>✅</Text>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
            {name} added
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            Send these login details to them:{'\n'}
            <Text style={{ fontWeight: '600', color: colors.text }}>{email}</Text> / {password}
          </Text>
          <Button label="Share with athlete" onPress={handleShareCredentials} />
          <Button label={copied ? 'Copied!' : 'Copy login details'} variant="outline" onPress={handleCopyCredentials} />
          <Button label="Back to squad" variant="outline" onPress={() => router.replace('/(coach)/(tabs)')} />
          <Button
            label="Add another"
            variant="outline"
            onPress={() => {
              setDone(false);
              setName('');
              setEmail('');
              setPassword('');
              setEvent('');
              setBaselineMark('');
              setQualifyingStandard('');
              setHasPermission(false);
              if (programmeEventGroups.length !== 1) setEventGroup(null);
            }}
          />
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Add athlete" onBack={() => router.back()} />
      <Screen>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 16 }}>
          Creates an athlete account directly in your programme — no join code needed. Set a temporary password and
          share it with them.
        </Text>

        <TextField label="Full name" value={name} onChangeText={setName} placeholder="First Last" textContentType="name" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="athlete@example.com"
        />
        <TextField
          label="Temporary password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          textContentType="newPassword"
          placeholder="At least 6 characters"
        />
        {programmeEventGroups.length > 1 && (
          <>
            <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Event group</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {programmeEventGroups.map((group) => {
                const active = eventGroup === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => setEventGroup(group)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={EVENT_GROUP_LABEL[group]}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: active ? colors.accent : 'transparent',
                      borderWidth: active ? 0 : 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                      {EVENT_GROUP_LABEL[group]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <TextField
          label="Primary event"
          value={event}
          onChangeText={setEvent}
          placeholder={eventGroup === 'sprints' ? 'e.g. 100m' : eventGroup === 'jumps' ? 'e.g. Long Jump' : 'e.g. Shot Put'}
        />
        <TextField
          label={`Baseline mark${eventGroup === 'sprints' ? ' (seconds)' : ' (metres)'} — optional`}
          value={baselineMark}
          onChangeText={setBaselineMark}
          keyboardType="decimal-pad"
          placeholder="Current best, if known"
        />
        <TextField
          label={`Qualifying standard${eventGroup === 'sprints' ? ' (seconds)' : ' (metres)'} — optional`}
          value={qualifyingStandard}
          onChangeText={setQualifyingStandard}
          keyboardType="decimal-pad"
          placeholder="Target standard for this athlete"
        />

        <Pressable
          onPress={() => setHasPermission((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hasPermission }}
          accessibilityLabel="I confirm I have permission to create this account"
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              marginTop: 1,
              borderRadius: 4,
              borderWidth: hasPermission ? 0 : 1.5,
              borderColor: colors.border,
              backgroundColor: hasPermission ? colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasPermission && <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1, lineHeight: 16 }}>
            I confirm I have this athlete&apos;s permission to create this account — or, if they&apos;re under 13, their
            parent or guardian&apos;s permission.
          </Text>
        </Pressable>

        {error && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>}

        <Button label="Add athlete" onPress={handleSubmit} loading={busy} disabled={!canSubmit} />
      </Screen>

      <Modal visible={limitModalVisible} transparent animationType="fade" onRequestClose={() => setLimitModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Plan limit reached</Text>
            <Text style={{ fontSize: 17, color: colors.textMuted, marginBottom: 16, lineHeight: 19 }}>
              You&apos;ve reached your {access.tier ? (TIER_LABEL[access.tier] ?? access.tier) : ''} plan limit of{' '}
              {Number.isFinite(access.athleteLimit) ? access.athleteLimit : ''} athletes. Upgrade to add more.
            </Text>
            <Button
              label="Upgrade"
              onPress={() => {
                setLimitModalVisible(false);
                router.push('/(coach)/paywall');
              }}
            />
            <Button label="Cancel" variant="outline" onPress={() => setLimitModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
