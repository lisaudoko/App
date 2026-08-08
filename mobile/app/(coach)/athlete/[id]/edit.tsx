import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import { ATHLETE_STATUS_LABEL, CLASS_CATEGORY_PRESETS, SEX_LABEL, type Athlete, type AthleteStatus, type Sex } from '@/data/types';
import { EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

const ALL_GROUPS: EventGroup[] = ['throws', 'sprints', 'jumps'];

export default function EditAthleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [programmeEventGroups, setProgrammeEventGroups] = useState<EventGroup[]>(ALL_GROUPS);

  const [name, setName] = useState('');
  const [event, setEvent] = useState('');
  const [eventGroup, setEventGroup] = useState<EventGroup>('throws');
  const [group, setGroup] = useState('');
  const [baselineMark, setBaselineMark] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [classCategory, setClassCategory] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [status, setStatus] = useState<AthleteStatus>('active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [squat, setSquat] = useState('');
  const [bench, setBench] = useState('');
  const [clean, setClean] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingTest, setSavingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSaved, setTestSaved] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([repository.getAthlete(id), repository.getProgrammeConfig()])
      .then(([a, config]) => {
        if (!a) return;
        setAthlete(a);
        setName(a.name);
        setEvent(a.event);
        setEventGroup(a.eventGroup ?? 'throws');
        setGroup(a.group);
        setBaselineMark(a.baselineMark ? String(a.baselineMark) : '');
        setDateOfBirth(a.dateOfBirth ?? '');
        setClassCategory(a.classCategory ?? '');
        setSex(a.sex);
        setStatus(a.status);
        if (config?.eventGroups.length) setProgrammeEventGroups(config.eventGroups);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load athlete'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveProfile() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await repository.updateProfile(id, {
        name,
        event,
        eventGroup,
        group,
        baselineMark: baselineMark ? parseFloat(baselineMark) : undefined,
        dateOfBirth: dateOfBirth.trim() || null,
        classCategory: classCategory.trim() || null,
        sex,
        status,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStrengthTest() {
    if (!id) return;
    setSavingTest(true);
    setTestError(null);
    try {
      await repository.addStrengthLog(id, {
        loggedAt: testDate,
        squat: squat ? parseFloat(squat) : null,
        bench: bench ? parseFloat(bench) : null,
        clean: clean ? parseFloat(clean) : null,
        deadlift: deadlift ? parseFloat(deadlift) : null,
      });
      setSquat('');
      setBench('');
      setClean('');
      setDeadlift('');
      setTestSaved(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Could not save strength test');
    } finally {
      setSavingTest(false);
    }
  }

  if (loading) return <LoadingState />;
  if (loadError || !athlete) return <ErrorState message={loadError ?? undefined} onRetry={load} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={`Edit ${athlete.name}`} onBack={() => router.back()} />
      <Screen>
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Profile</Text>
          <TextField label="Name" value={name} onChangeText={setName} />

          {programmeEventGroups.length > 1 && (
            <>
              <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Event group</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {programmeEventGroups.map((g) => {
                  const active = eventGroup === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setEventGroup(g)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={EVENT_GROUP_LABEL[g]}
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
                        {EVENT_GROUP_LABEL[g]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <TextField label="Event" value={event} onChangeText={setEvent} placeholder="e.g. Shot Put" />
          <TextField label="Group" value={group} onChangeText={setGroup} placeholder="e.g. Varsity" />

          <TextField label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

          <TextField label="Class / category" value={classCategory} onChangeText={setClassCategory} placeholder="e.g. Open, Class 1, U20" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 12 }}>
            {CLASS_CATEGORY_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setClassCategory(preset)}
                accessibilityRole="button"
                accessibilityLabel={preset}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{preset}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Sex</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['male', 'female'] as Sex[]).map((s) => {
              const active = sex === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSex((current) => (current === s ? null : s))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={SEX_LABEL[s]}
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
                    {SEX_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {(Object.keys(ATHLETE_STATUS_LABEL) as AthleteStatus[]).map((s) => {
              const active = status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={ATHLETE_STATUS_LABEL[s]}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                    {ATHLETE_STATUS_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label={`Baseline mark (${eventGroup === 'sprints' ? 'seconds' : 'm'})`}
            keyboardType="decimal-pad"
            value={baselineMark}
            onChangeText={setBaselineMark}
          />
          {error && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>}
          <Button label="Save profile" onPress={handleSaveProfile} loading={saving} />
        </Card>

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Add strength test</Text>
          <TextField label="Date (YYYY-MM-DD)" value={testDate} onChangeText={setTestDate} keyboardType="numbers-and-punctuation" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Squat" keyboardType="decimal-pad" value={squat} onChangeText={setSquat} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Bench" keyboardType="decimal-pad" value={bench} onChangeText={setBench} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Clean" keyboardType="decimal-pad" value={clean} onChangeText={setClean} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Deadlift" keyboardType="decimal-pad" value={deadlift} onChangeText={setDeadlift} />
            </View>
          </View>
          {testError && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{testError}</Text>}
          {testSaved && <Text style={{ color: colors.success, fontSize: 15, marginBottom: 8 }}>Strength test saved.</Text>}
          <Button label="Add test" variant="outline" onPress={handleAddStrengthTest} loading={savingTest} />
        </Card>
      </Screen>
    </View>
  );
}
