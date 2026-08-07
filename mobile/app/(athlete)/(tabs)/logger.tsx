import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { parseLogText, type ParsedLogResult } from '@/lib/parseLog';
import { repository } from '@/data/repository';
import { notifyPersonalBest } from '@/notifications/localNotifications';
import { formatPerformance, parseTimeToSeconds, type PerformanceUnit } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { InfoTip } from '@/components/InfoTip';

export default function LoggerScreen() {
  const { colors } = useAppTheme();
  const { data, refresh } = useAthleteSelf();
  const eventGroup = data.athlete?.eventGroup ?? 'throws';
  const isTimed = eventGroup === 'sprints';
  const perfUnit: PerformanceUnit = isTimed ? 'seconds' : 'metres';
  const metricLabel = isTimed ? 'Best time this week' : eventGroup === 'jumps' ? 'Best jump this week' : 'Best throw this week';

  const [manualMode, setManualMode] = useState(false);

  // Natural-language flow
  const [nlText, setNlText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedLogResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual flow
  const [manualMark, setManualMark] = useState('');
  const [manualMarkError, setManualMarkError] = useState<string | null>(null);
  const [manualRpe, setManualRpe] = useState(6);

  // Shared wellness inputs
  const [sleep, setSleep] = useState(7);
  const [soreness, setSoreness] = useState(4);
  const [energy, setEnergy] = useState(7);
  const [motivation, setMotivation] = useState(7);
  const [bodyWeight, setBodyWeight] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loggedMark, setLoggedMark] = useState<number | null>(null);
  const [loggedRpe, setLoggedRpe] = useState<number | null>(null);

  async function handleParse() {
    if (!nlText.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseLogText(nlText.trim(), eventGroup);
      setParsed(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not understand that — try again or enter manually.');
    } finally {
      setParsing(false);
    }
  }

  async function finishSubmit(mark: number | null, rpe: number | null, notes: string | null) {
    if (!data.athlete || mark == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    setLoggedMark(mark);
    setLoggedRpe(rpe);
    setSubmitted(true);
    try {
      const { isNewPersonalBest } = await repository.submitWeeklyResult(data.athlete.id, {
        mark,
        rpe,
        sleep,
        soreness,
        energy,
        motivation,
        bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
        notes,
      });
      await refresh();
      if (isNewPersonalBest) {
        notifyPersonalBest(data.athlete.id, data.athlete.name, mark, perfUnit).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setNlText('');
    setParsed(null);
    setParseError(null);
    setManualMark('');
    setBodyWeight('');
  }

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Log this week" onBack={() => router.back()} />
        <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 300 }}>
            <Text style={{ fontSize: 50, textAlign: 'center' }}>✅</Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>Logged!</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              {loggedMark != null ? formatPerformance(loggedMark, perfUnit) : '—'} · RPE {loggedRpe ?? '—'}
            </Text>
            <Button label="Back to workout" onPress={() => router.push('/(athlete)/(tabs)')} />
            <Button label="Log another" variant="outline" onPress={resetForm} />
          </MotiView>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Log this week" onBack={() => router.back()} />
      <Screen>
        {!manualMode ? (
          <>
            <Card>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Natural language entry</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>Type it how you&apos;d say it — we&apos;ll parse it</Text>
              <TextField
                value={nlText}
                onChangeText={(t) => {
                  setNlText(t);
                  setParsed(null);
                  setParseError(null);
                }}
                placeholder={
                  isTimed ? 'e.g. "ran 10.82s, RPE 7, felt strong"' : 'e.g. "threw 16.1m, RPE 7, felt strong"'
                }
                multiline
              />
              {parseError && <Text style={{ fontSize: 12, color: colors.danger, marginTop: 4 }}>{parseError}</Text>}
              {!parsed && (
                <Button label="Parse entry" onPress={handleParse} loading={parsing} disabled={!nlText.trim()} />
              )}
            </Card>

            <AnimatePresence>
              {parsed && (
                <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0 }}>
                  <Card>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 }}>We understood</Text>
                    <Text style={{ fontSize: 18, color: colors.text }}>
                      {parsed.mark != null ? formatPerformance(parsed.mark, perfUnit) : `No ${isTimed ? 'time' : 'distance'}`}{' '}
                      · {parsed.rpe != null ? `RPE ${parsed.rpe}` : 'No RPE'}
                    </Text>
                    {parsed.notes && <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{parsed.notes}</Text>}
                    {parsed.confidence === 'low' && (
                      <Text style={{ fontSize: 12, color: colors.warning, marginTop: 4 }}>
                        Not fully sure about this one — check it before confirming.
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Button label="Edit" variant="outline" onPress={() => setParsed(null)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Confirm"
                          onPress={() => finishSubmit(parsed.mark, parsed.rpe, parsed.notes)}
                          loading={submitting}
                          disabled={parsed.mark == null}
                        />
                      </View>
                    </View>
                  </Card>
                </MotiView>
              )}
            </AnimatePresence>

            <Text style={{ textAlign: 'center', fontSize: 13, color: colors.textFaint, marginVertical: 10 }}>— or —</Text>
            <Pressable onPress={() => setManualMode(true)}>
              <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600', textAlign: 'center' }}>Enter manually</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => setManualMode(false)} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>← Back to natural language entry</Text>
            </Pressable>

            <TextField
              label={metricLabel}
              value={manualMark}
              onChangeText={(t) => {
                setManualMark(t);
                setManualMarkError(null);
              }}
              keyboardType={isTimed ? 'numbers-and-punctuation' : 'decimal-pad'}
              placeholder={isTimed ? 'e.g. 10.82 or 1:48.30' : 'e.g. 16.1'}
              error={manualMarkError ?? undefined}
            />

            <SliderRow
              label="RPE"
              value={manualRpe}
              onChange={setManualRpe}
              max={10}
              info="Rate of Perceived Exertion — how hard this session felt, on a scale of 1 (very easy) to 10 (maximal effort). It's a subjective effort score, not tied to any specific pace or weight."
            />
          </>
        )}

        <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 8, marginTop: 4 }}>Wellness check-in</Text>
        <SliderRow label="Sleep" value={sleep} onChange={setSleep} max={10} />
        <SliderRow label="Soreness" value={soreness} onChange={setSoreness} max={10} />
        <SliderRow label="Energy" value={energy} onChange={setEnergy} max={10} />
        <SliderRow label="Motivation" value={motivation} onChange={setMotivation} max={10} />
        <TextField
          label="Body weight (lbs) — optional"
          value={bodyWeight}
          onChangeText={setBodyWeight}
          keyboardType="decimal-pad"
          placeholder="e.g. 178"
        />

        {manualMode && (
          <Button
            label="Save"
            onPress={() => {
              const mark = manualMark ? (isTimed ? parseTimeToSeconds(manualMark) : parseFloat(manualMark)) : null;
              if (mark == null || !Number.isFinite(mark)) {
                setManualMarkError(`Enter a valid ${isTimed ? 'time' : 'distance'} — e.g. ${isTimed ? '10.82 or 1:48.30' : '16.1'}.`);
                return;
              }
              finishSubmit(mark, manualRpe, null);
            }}
            loading={submitting}
            disabled={!manualMark}
          />
        )}
      </Screen>
    </View>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  max,
  info,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  info?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
          {info && <InfoTip term={label} explanation={info} />}
        </View>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{value}</Text>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={max}
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
