import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { parseNaturalLanguageEntry } from '@/engine/nlLogger';
import { repository } from '@/data/repository';
import { notifyPersonalBest } from '@/notifications/localNotifications';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';

export default function LoggerScreen() {
  const { colors } = useAppTheme();
  const { data, refresh } = useAthleteSelf();

  const [nlText, setNlText] = useState('');
  const [manualMark, setManualMark] = useState('');
  const [sleep, setSleep] = useState(7);
  const [soreness, setSoreness] = useState(4);
  const [energy, setEnergy] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const parsed = useMemo(() => (nlText.trim() ? parseNaturalLanguageEntry(nlText) : null), [nlText]);
  const manualValue = manualMark ? parseFloat(manualMark) : null;
  const mark = parsed?.mark ?? (manualValue != null && Number.isFinite(manualValue) ? manualValue : null);
  const rpe = parsed?.rpe ?? null;

  async function handleSubmit() {
    if (!data.athlete || mark == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    // Optimistic: show success state immediately, persist in the background.
    setSubmitted(true);
    try {
      const { isNewPersonalBest } = await repository.submitWeeklyResult(data.athlete.id, { mark, rpe, sleep, soreness, energy });
      await refresh();
      if (isNewPersonalBest) {
        notifyPersonalBest(data.athlete.name, mark, data.athlete.unit).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Log this week" onBack={() => router.back()} />
        <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 300 }}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>✅</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>Logged!</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              {mark}
              {data.athlete?.unit} · RPE {rpe ?? '—'}
            </Text>
            <Button label="Back to workout" onPress={() => router.push('/(athlete)/(tabs)')} />
            <Button
              label="Log another"
              variant="outline"
              onPress={() => {
                setSubmitted(false);
                setNlText('');
                setManualMark('');
              }}
            />
          </MotiView>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Log this week" onBack={() => router.back()} />
      <Screen>
        <Card>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Natural language entry</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Type it how you&apos;d say it — the app parses it</Text>
          <TextField
            value={nlText}
            onChangeText={setNlText}
            placeholder='e.g. "threw 16.1m, RPE 7, felt strong"'
            multiline
          />
          <AnimatePresence>
            {parsed && (parsed.mark != null || parsed.rpe != null) && (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Text style={{ fontSize: 10, color: colors.success }}>
                  ✓ Parsed: {parsed.mark != null ? `${parsed.mark}m` : 'no mark'} · {parsed.rpe != null ? `RPE ${parsed.rpe}` : 'no RPE'}
                </Text>
              </MotiView>
            )}
          </AnimatePresence>
        </Card>

        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.textFaint, marginVertical: 6 }}>— or fill manually —</Text>

        <TextField
          label="Best throw this week"
          value={manualMark}
          onChangeText={setManualMark}
          keyboardType="decimal-pad"
          placeholder="e.g. 16.1"
        />
        {parsed?.mark != null && manualMark.length > 0 && (
          <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: -8, marginBottom: 12 }}>
            Using {parsed.mark}m from the text above — clear it to use this field instead.
          </Text>
        )}

        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Wellness check-in</Text>
        <SliderRow label="Sleep" value={sleep} onChange={setSleep} />
        <SliderRow label="Soreness" value={soreness} onChange={setSoreness} />
        <SliderRow label="Energy" value={energy} onChange={setEnergy} />

        <Button label="Submit this week" onPress={handleSubmit} loading={submitting} disabled={mark == null} />
      </Screen>
    </View>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{value}</Text>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.text}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.text}
      />
    </View>
  );
}
