import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import type { Athlete } from '@/data/types';
import { EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';

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
  const [qualifyingEvent, setQualifyingEvent] = useState('');
  const [qualifyingStandard, setQualifyingStandard] = useState('');
  const [baselineMark, setBaselineMark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [squat, setSquat] = useState('');
  const [bench, setBench] = useState('');
  const [clean, setClean] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingTest, setSavingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSaved, setTestSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([repository.getAthlete(id), repository.getProgrammeConfig()])
      .then(([a, config]) => {
        if (!a) return;
        setAthlete(a);
        setName(a.name);
        setEvent(a.event);
        setEventGroup(a.eventGroup ?? 'throws');
        setGroup(a.group);
        setQualifyingEvent(a.qualifyingEvent);
        setQualifyingStandard(a.qualifyingStandard ? String(a.qualifyingStandard) : '');
        setBaselineMark(a.baselineMark ? String(a.baselineMark) : '');
        if (config?.eventGroups.length) setProgrammeEventGroups(config.eventGroups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
        qualifyingEvent,
        qualifyingStandard: qualifyingStandard ? parseFloat(qualifyingStandard) : undefined,
        baselineMark: baselineMark ? parseFloat(baselineMark) : undefined,
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

  if (loading || !athlete) return <LoadingState />;

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
          <TextField label="Group / classification" value={group} onChangeText={setGroup} placeholder="e.g. Varsity, U18" />
          <TextField label="Qualifying event" value={qualifyingEvent} onChangeText={setQualifyingEvent} />
          <TextField
            label={`Qualifying standard (${eventGroup === 'sprints' ? 'seconds' : 'm'})`}
            keyboardType="decimal-pad"
            value={qualifyingStandard}
            onChangeText={setQualifyingStandard}
          />
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
