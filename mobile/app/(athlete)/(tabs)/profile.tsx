import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { useAuthStore } from '@/store/authStore';
import { repository } from '@/data/repository';
import type { Meet, MeetEntry } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { LoadingState } from '@/components/LoadingState';
import { EVENT_GROUP_DIRECTION, formatPerformance, isBetter, type PerformanceUnit } from '@/lib/formatPerformance';

export default function AthleteProfileScreen() {
  const { colors } = useAppTheme();
  const { data, loading, refresh } = useAthleteSelf();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const athlete = data.athlete;

  const [editVisible, setEditVisible] = useState(false);
  const [name, setName] = useState('');
  const [event, setEvent] = useState('');
  const [baselineMark, setBaselineMark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit() {
    if (!athlete) return;
    setName(session?.name ?? '');
    setEvent(athlete.event);
    setBaselineMark(athlete.baselineMark ? String(athlete.baselineMark) : '');
    setError(null);
    setEditVisible(true);
  }

  async function handleSaveProfile() {
    if (!athlete) return;
    setSaving(true);
    setError(null);
    try {
      await repository.updateProfile(athlete.id, {
        name,
        event,
        baselineMark: baselineMark ? parseFloat(baselineMark) : undefined,
      });
      await Promise.all([refresh(), useAuthStore.getState().restoreSession()]);
      setEditVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  const weeksLogged = data.logs.filter((l) => l.mark != null || l.rpe != null).length;

  const streak = useMemo(() => {
    const loggedWeeks = new Set(data.logs.filter((l) => l.mark != null || l.rpe != null).map((l) => l.week));
    let count = 0;
    for (let week = data.mesocycleWeek; week >= 1; week--) {
      if (!loggedWeeks.has(week)) break;
      count++;
    }
    return count;
  }, [data.logs, data.mesocycleWeek]);

  const direction = EVENT_GROUP_DIRECTION[athlete?.eventGroup ?? 'throws'];
  const perfUnit: PerformanceUnit = athlete?.unit === 's' ? 'seconds' : 'metres';

  const [meetResults, setMeetResults] = useState<{ entry: MeetEntry; meet: Meet }[]>([]);
  useEffect(() => {
    repository.getMyMeetEntries().then(setMeetResults);
  }, []);

  const bestByEvent = useMemo(() => {
    const best = new Map<string, number>();
    for (const { entry } of meetResults) {
      if (entry.finalMark == null) continue;
      const current = best.get(entry.event);
      if (current == null || isBetter(entry.finalMark, current, direction)) best.set(entry.event, entry.finalMark);
    }
    return best;
  }, [meetResults, direction]);

  const personalBests = useMemo(() => {
    const sorted = [...data.logs].filter((l) => l.mark != null).sort((a, b) => a.week - b.week);
    const rows: { date: string; mark: number }[] = [];
    let best: number | null = null;
    for (const log of sorted) {
      const mark = log.mark as number;
      if (best == null || isBetter(mark, best, direction)) {
        best = mark;
        rows.push({ date: log.loggedAt ?? log.label, mark: best });
      }
    }
    return rows.reverse();
  }, [data.logs, direction]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (loading) return <LoadingState />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Profile" rightIcon="create-outline" onRightPress={openEdit} rightLabel="Edit profile" />
      <Screen onRefresh={refresh}>
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 25, fontWeight: '600', color: colors.accentText }}>
              {session?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '600', color: colors.text, marginTop: 10 }}>{session?.name}</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 2 }}>{athlete?.event ?? '—'}</Text>
          <Text style={{ fontSize: 13, color: colors.textFaint, marginTop: 2 }}>{session?.programmeName}</Text>
        </Card>

        <Card style={{ flexDirection: 'row' }}>
          <StatCell value={weeksLogged} label="Weeks logged" />
          <StatCell value={streak} label="Current streak" />
        </Card>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Personal bests
        </Text>
        <Card>
          {personalBests.length === 0 && <Text style={{ fontSize: 15, color: colors.textMuted }}>No results logged yet.</Text>}
          {personalBests.map((pb, i) => (
            <View
              key={`${pb.date}-${pb.mark}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: i === personalBests.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, color: colors.textMuted }}>
                {new Date(pb.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600' }}>
                {formatPerformance(pb.mark, perfUnit)}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          My meets
        </Text>
        <Card>
          {meetResults.length === 0 && <Text style={{ fontSize: 15, color: colors.textMuted }}>No meet results yet.</Text>}
          {meetResults.map(({ entry, meet }, i) => {
            const isPb = entry.finalMark != null && bestByEvent.get(entry.event) === entry.finalMark;
            return (
              <View
                key={entry.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  borderBottomWidth: i === meetResults.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{meet.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {meet.date} · {entry.event}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {entry.finalMark != null ? formatPerformance(entry.finalMark, perfUnit) : '—'}
                </Text>
                {isPb && <Pill label="PB" tone="success" />}
                {entry.qualified && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
              </View>
            );
          })}
        </Card>

        <Pressable
          onPress={() => router.push('/(athlete)/settings')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, marginTop: 8 }}
        >
          <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
          <Text style={{ fontSize: 17, color: colors.text }}>Settings</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>

        <Button label="Log out" variant="outline" onPress={handleLogout} />
      </Screen>

      <Modal visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <ScreenHeader title="Edit profile" onBack={() => setEditVisible(false)} />
          <Screen>
            <TextField label="Name" value={name} onChangeText={setName} />
            <TextField label="Event" value={event} onChangeText={setEvent} placeholder="e.g. Shot Put" />
            <TextField label="Baseline mark (m)" keyboardType="decimal-pad" value={baselineMark} onChangeText={setBaselineMark} />
            {error && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>}
            <Button label="Save" onPress={handleSaveProfile} loading={saving} />
          </Screen>
        </View>
      </Modal>
    </View>
  );
}

function StatCell({ value, label }: { value: number; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 25, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
