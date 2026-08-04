import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { useAuthStore } from '@/store/authStore';
import { repository } from '@/data/repository';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { LoadingState } from '@/components/LoadingState';

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

  const personalBests = useMemo(() => {
    const sorted = [...data.logs].filter((l) => l.mark != null).sort((a, b) => a.week - b.week);
    const rows: { date: string; mark: number }[] = [];
    let best = -Infinity;
    for (const log of sorted) {
      if ((log.mark as number) > best) {
        best = log.mark as number;
        rows.push({ date: log.loggedAt ?? log.label, mark: best });
      }
    }
    return rows.reverse();
  }, [data.logs]);

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
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.accentText }}>
              {session?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 10 }}>{session?.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{athlete?.event ?? '—'}</Text>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>{session?.programmeName}</Text>
        </Card>

        <Card style={{ flexDirection: 'row' }}>
          <StatCell value={weeksLogged} label="Weeks logged" />
          <StatCell value={streak} label="Current streak" />
        </Card>

        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Personal bests
        </Text>
        <Card>
          {personalBests.length === 0 && <Text style={{ fontSize: 12, color: colors.textMuted }}>No results logged yet.</Text>}
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
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {new Date(pb.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>
                {pb.mark}
                {athlete?.unit}
              </Text>
            </View>
          ))}
        </Card>

        <Pressable
          onPress={() => router.push('/(athlete)/settings')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, marginTop: 8 }}
        >
          <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
          <Text style={{ fontSize: 13, color: colors.text }}>Settings</Text>
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
            {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}
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
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
