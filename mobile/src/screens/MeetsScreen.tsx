import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import type { Meet, MeetType } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';
import { DateField } from '@/components/DateField';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Sheet } from '@/components/Sheet';
import { StandardsPanel } from '@/screens/StandardsPanel';

export const MEET_TYPE_LABEL: Record<MeetType, string> = {
  qualifier: 'Qualifier',
  championship: 'Championship',
  invitational: 'Invitational',
  dual_meet: 'Dual Meet',
  time_trial: 'Time Trial',
};
const MEET_TYPES = Object.keys(MEET_TYPE_LABEL) as MeetType[];

function emptyForm() {
  return { name: '', date: '', location: '', meetType: null as MeetType | null, conditions: '' };
}

export function MeetsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<'schedule' | 'standards'>('schedule');
  const [meets, setMeets] = useState<Meet[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([repository.getMeets(), repository.getMeetEntryCountsByMeet()])
      .then(([m, c]) => {
        setMeets(m);
        setCounts(c);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load meets'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A meet stays in "Upcoming" until the coach explicitly marks it completed — not
  // automatically once its date passes — so a just-finished meet doesn't silently fall
  // out of view before results/notes are wrapped up.
  const { upcoming, completed } = useMemo(() => {
    const up = meets.filter((m) => !m.completed).sort((a, b) => a.date.localeCompare(b.date));
    const done = meets.filter((m) => m.completed).sort((a, b) => b.date.localeCompare(a.date));
    return { upcoming: up, completed: done };
  }, [meets]);

  function openAdd() {
    setForm(emptyForm());
    setError(null);
    setAddVisible(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('A name and date are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await repository.createMeet({
        name: form.name.trim(),
        date: form.date,
        standards: {},
        location: form.location.trim() || undefined,
        meetType: form.meetType ?? undefined,
        conditions: form.conditions.trim() || undefined,
      });
      setAddVisible(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create meet');
    } finally {
      setSaving(false);
    }
  }

  function MeetCard({ meet }: { meet: Meet }) {
    return (
      <Pressable onPress={() => router.push(`/(coach)/meets/${meet.id}`)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 52 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{meet.name}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                {meet.date}
                {meet.location ? ` · ${meet.location}` : ''}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 6 }}>
                {counts[meet.id] ?? 0} {counts[meet.id] === 1 ? 'athlete' : 'athletes'} entered
              </Text>
            </View>
            {meet.meetType && <Pill label={MEET_TYPE_LABEL[meet.meetType]} tone="neutral" />}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8, alignSelf: 'center' }} />
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Meets" onBack={onBack} rightIcon="add-circle-outline" onRightPress={openAdd} rightLabel="Add meet" />

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
        {(['schedule', 'standards'] as const).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t === 'schedule' ? 'Schedule' : 'Standards'}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                {t === 'schedule' ? 'Schedule' : 'Standards'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingState />
      ) : loadError && meets.length === 0 ? (
        <ErrorState onRetry={load} message={loadError} />
      ) : tab === 'standards' ? (
        <Screen onRefresh={async () => load()}>
          <StandardsPanel />
        </Screen>
      ) : (
        <Screen onRefresh={async () => load()}>
          {meets.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <Ionicons name="trophy-outline" size={32} color={colors.textFaint} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>No meets yet</Text>
              <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                Add your season&apos;s competitions to track results and qualifying standards.
              </Text>
            </View>
          )}

          {upcoming.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Upcoming
              </Text>
              {upcoming.map((meet) => (
                <MeetCard key={meet.id} meet={meet} />
              ))}
            </>
          )}

          {completed.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Completed
              </Text>
              {completed.map((meet) => (
                <MeetCard key={meet.id} meet={meet} />
              ))}
            </>
          )}
        </Screen>
      )}

      <Sheet visible={addVisible} onClose={() => setAddVisible(false)}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Add meet</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <TextField label="Meet name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="e.g. Carifta Games" />
              <DateField label="Date" value={form.date} onChange={(t) => setForm((f) => ({ ...f, date: t }))} />
              <LocationAutocomplete label="Location" value={form.location} onChangeText={(t) => setForm((f) => ({ ...f, location: t }))} placeholder="e.g. National Stadium" />

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Meet type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {MEET_TYPES.map((t) => {
                  const active = form.meetType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setForm((f) => ({ ...f, meetType: active ? null : t }))}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={MEET_TYPE_LABEL[t]}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: active ? colors.accent : 'transparent',
                        borderWidth: active ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: active ? colors.accentText : colors.textMuted }}>{MEET_TYPE_LABEL[t]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextField
                label="Conditions (optional)"
                value={form.conditions}
                onChangeText={(t) => setForm((f) => ({ ...f, conditions: t }))}
                placeholder="e.g. Windy, 28°C"
              />

          {error && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text>}
          <Button label="Add meet" onPress={handleSave} loading={saving} />
        </ScrollView>
      </Sheet>
    </View>
  );
}
