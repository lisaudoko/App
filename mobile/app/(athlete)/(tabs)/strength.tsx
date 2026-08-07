import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { repository } from '@/data/repository';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { StatRow } from '@/components/StatCard';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { StaleBanner } from '@/components/StaleBanner';
import { StrengthChart } from '@/components/charts/StrengthChart';
import { InfoTip } from '@/components/InfoTip';

export default function AthleteStrengthScreen() {
  const { colors } = useAppTheme();
  const { data, loading, isStale, error: loadError, refresh } = useAthleteSelf();

  const [squat, setSquat] = useState('');
  const [bench, setBench] = useState('');
  const [clean, setClean] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (loading) return <LoadingState />;
  if (loadError && !data.athlete) return <ErrorState onRetry={refresh} />;
  if (!data.athlete) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const { squat: curSquat, clean: curClean, bench: curBench, deadlift: curDeadlift } = data.athlete.currentMaxes;
  const tests = data.tests;
  const last = tests[tests.length - 1];
  const first = tests[0];

  async function handleSave() {
    if (!data.athlete) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await repository.addStrengthLog(data.athlete.id, {
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
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save strength test');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Strength" subtitle={data.athlete.name} />
      {isStale && <StaleBanner />}
      <Screen onRefresh={refresh}>
        <StatRow
          stats={[
            { label: 'Squat', value: curSquat ? `${curSquat}` : '—' },
            { label: 'Bench', value: curBench ? `${curBench}` : '—' },
            { label: 'Clean', value: curClean ? `${curClean}` : '—' },
            { label: 'Deadlift', value: curDeadlift ? `${curDeadlift}` : '—' },
          ]}
        />

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Strength progression</Text>
            <InfoTip term="1RM" explanation="One-Rep Max — the most weight you can lift for a single complete repetition of an exercise. It's the standard reference point strength programmes are built around." />
          </View>
          <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>
            1RM maxes across test dates (lbs) · Squat / Clean / Bench
          </Text>
          <StrengthChart tests={tests} />
          {tests.length >= 3 && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <LegendDot color={colors.text} label="Squat" />
              <LegendDot color={colors.textMuted} label="Clean" />
              <LegendDot color={colors.textFaint} label="Bench" />
            </View>
          )}
          {last && first && (
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 8 }}>
              Deadlift: {last.deadlift} lbs{last.deadlift !== first.deadlift ? ` (from ${first.deadlift})` : ''}
            </Text>
          )}
        </Card>

        <Card>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Log a strength test</Text>
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
          {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}
          {saved && <Text style={{ color: colors.success, fontSize: 12, marginBottom: 8 }}>Strength test saved.</Text>}
          <Button
            label="Save test"
            onPress={handleSave}
            loading={saving}
            disabled={!squat && !bench && !clean && !deadlift}
          />
        </Card>
      </Screen>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 14, height: 2, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}
