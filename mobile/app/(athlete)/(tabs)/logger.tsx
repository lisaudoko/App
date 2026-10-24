import React, { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { parseLogText, type ParsedLogResult } from '@/lib/parseLog';
import { repository } from '@/data/repository';
import { notifyPersonalBest } from '@/notifications/localNotifications';
import { EVENT_GROUP_DIRECTION, attemptWording, eventUsesWind, formatPerformance, parseTimeToSeconds, type PerformanceUnit } from '@/lib/formatPerformance';
import { bestLegalAttempt } from '@/engine/meetEntry';
import type { MeetAttempt } from '@/data/types';
import { AttemptsInput, emptyAttemptRows, type AttemptRow } from '@/components/AttemptsInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { InfoTip } from '@/components/InfoTip';
import { useUnitsStore } from '@/store/unitsStore';
import { displayToLbs } from '@/lib/weightUnits';

export default function LoggerScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, refresh } = useAthleteSelf();
  const weightUnit = useUnitsStore((s) => s.weightUnit);
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
  const [entryMode, setEntryMode] = useState<'best' | 'attempts'>('best');
  const [attemptRows, setAttemptRows] = useState<AttemptRow[]>(() => emptyAttemptRows(3));
  const [manualMark, setManualMark] = useState('');
  const [manualMarkError, setManualMarkError] = useState<string | null>(null);
  const [manualRpe, setManualRpe] = useState(6);

  // Shared wellness inputs
  const [sleep, setSleep] = useState(7);
  const [soreness, setSoreness] = useState(4);
  const [energy, setEnergy] = useState(7);
  const [motivation, setMotivation] = useState(7);
  const [bodyWeight, setBodyWeight] = useState('');

  const wording = attemptWording(eventGroup, data.athlete?.event ?? '');
  const showWind = eventUsesWind(data.athlete?.event ?? '');
  const parsedAttempts: MeetAttempt[] = attemptRows
    .map((r, i) => {
      const raw = r.result.trim() ? (isTimed ? parseTimeToSeconds(r.result) : parseFloat(r.result)) : null;
      return { attempt: i + 1, mark: raw != null && Number.isFinite(raw) ? raw : null, wind: r.wind.trim() || null, foul: r.foul, notes: '' };
    })
    .filter((a) => a.mark != null || a.foul);
  const bestFromAttempts = bestLegalAttempt(parsedAttempts, EVENT_GROUP_DIRECTION[eventGroup]);
  const bestAttemptIndex = bestFromAttempts == null ? null : attemptRows.findIndex((r, i) => {
    const a = parsedAttempts.find((p) => p.attempt === i + 1);
    return a != null && !a.foul && a.mark === bestFromAttempts;
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  async function finishSubmit(mark: number | null, rpe: number | null, notes: string | null, attempts?: MeetAttempt[]) {
    if (!data.athlete || mark == null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { isNewPersonalBest } = await repository.submitWeeklyResult(data.athlete.id, {
        mark,
        rpe,
        sleep,
        soreness,
        energy,
        motivation,
        bodyWeight: bodyWeight && Number.isFinite(parseFloat(bodyWeight)) ? displayToLbs(parseFloat(bodyWeight), weightUnit) : null,
        notes,
        attempts,
      });
      // Only now, after the write actually succeeded, do we show the "Logged!" screen —
      // this used to fire before the repository call, so a failed submit (network error,
      // etc.) still told the athlete it was saved when nothing had actually been written.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoggedMark(mark);
      setLoggedRpe(rpe);
      setSubmitted(true);
      repository.notifyCoachLogSubmitted(mark, isNewPersonalBest).catch(() => {});
      await refresh();
      if (isNewPersonalBest) {
        notifyPersonalBest(data.athlete.id, data.athlete.name, mark, perfUnit).catch(() => {});
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save your log — check your connection and try again.');
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
    setAttemptRows(emptyAttemptRows(3));
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
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>How are you feeling?</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Type it how you&apos;d say it — include your RPE (effort, 1–10)</Text>
                <InfoTip term="RPE" explanation="Rate of Perceived Exertion — how hard this session felt, on a scale of 1 (very easy) to 10 (maximal effort). It's a subjective effort score, not tied to any specific pace or weight." />
              </View>
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
                    {submitError && <Text style={{ fontSize: 13, color: colors.danger, marginTop: 8 }}>{submitError}</Text>}
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
              <Text style={{ fontSize: 13, color: colors.textMuted }}>← Back to How are you feeling?</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {([
                ['best', 'Best result only'],
                ['attempts', `Each ${wording.unitNoun.toLowerCase()}`],
              ] as const).map(([mode, label]) => {
                const active = entryMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setEntryMode(mode);
                      setManualMarkError(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
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
                    <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {entryMode === 'best' ? (
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
            ) : (
              <Card>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                  {wording.unitNoun === 'Run' ? 'Your runs this week' : 'Your attempts this week'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
                  Fill in what you did and flip {wording.failLabel.toLowerCase()} on any that didn&apos;t count. Your best counted result is picked for you.
                </Text>
                <AttemptsInput
                  rows={attemptRows}
                  onChange={(rows) => {
                    setAttemptRows(rows);
                    setManualMarkError(null);
                  }}
                  unitNoun={wording.unitNoun}
                  failLabel={wording.failLabel}
                  resultPlaceholder={isTimed ? '10.82' : '16.10'}
                  keyboardType={isTimed ? 'numbers-and-punctuation' : 'decimal-pad'}
                  showWind={showWind}
                  bestIndex={bestAttemptIndex != null && bestAttemptIndex >= 0 ? bestAttemptIndex : null}
                />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 10 }}>
                  {bestFromAttempts != null ? `Best: ${formatPerformance(bestFromAttempts, perfUnit)}` : `Best: no counted ${isTimed ? 'time' : 'result'} yet`}
                </Text>
                {manualMarkError && <Text style={{ fontSize: 13, color: colors.danger, marginTop: 4 }}>{manualMarkError}</Text>}
              </Card>
            )}

            <SliderRow
              label="RPE"
              value={manualRpe}
              onChange={setManualRpe}
              max={10}
              info="Rate of Perceived Exertion — how hard this session felt, on a scale of 1 (very easy) to 10 (maximal effort). It's a subjective effort score, not tied to any specific pace or weight."
            />
          </>
        )}

        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Wellness check</Text>
          <SliderRow label="Sleep" value={sleep} onChange={setSleep} max={10} lowLabel="1 = barely slept" highLabel="10 = slept great" />
          <SliderRow label="Soreness" value={soreness} onChange={setSoreness} max={10} lowLabel="1 = not sore" highLabel="10 = very sore" />
          <SliderRow label="Energy" value={energy} onChange={setEnergy} max={10} lowLabel="1 = drained" highLabel="10 = full of energy" />
          <SliderRow label="Motivation" value={motivation} onChange={setMotivation} max={10} lowLabel="1 = not feeling it" highLabel="10 = fired up" />
          <TextField
            label={`Body weight (${weightUnit}) — optional`}
            value={bodyWeight}
            onChangeText={setBodyWeight}
            keyboardType="decimal-pad"
            placeholder={weightUnit === 'kg' ? 'e.g. 80' : 'e.g. 178'}
          />
        </Card>

        {manualMode && (
          <View style={{ marginBottom: insets.bottom }}>
            {submitError && <Text style={{ fontSize: 13, color: colors.danger, marginBottom: 8 }}>{submitError}</Text>}
            <Button
              label="Save"
              onPress={() => {
                if (entryMode === 'attempts') {
                  if (bestFromAttempts == null) {
                    setManualMarkError(`Enter at least one counted ${isTimed ? 'time' : 'result'} — an entry marked ${wording.failLabel.toLowerCase()} doesn't count.`);
                    return;
                  }
                  finishSubmit(bestFromAttempts, manualRpe, null, parsedAttempts.map((a, i) => ({ ...a, attempt: i + 1 })));
                  return;
                }
                const mark = manualMark ? (isTimed ? parseTimeToSeconds(manualMark) : parseFloat(manualMark)) : null;
                if (mark == null || !Number.isFinite(mark)) {
                  setManualMarkError(`Enter a valid ${isTimed ? 'time' : 'distance'} — e.g. ${isTimed ? '10.82 or 1:48.30' : '16.1'}.`);
                  return;
                }
                finishSubmit(mark, manualRpe, null);
              }}
              loading={submitting}
              disabled={entryMode === 'attempts' ? bestFromAttempts == null : !manualMark}
            />
          </View>
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
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  info?: string;
  lowLabel?: string;
  highLabel?: string;
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
        // A still-focused TextField above (e.g. the mark entry field) leaves the keyboard
        // open — dragging the slider doesn't count as the "tap elsewhere" that Screen's own
        // dismiss-on-background-tap relies on, since the slider consumes that touch itself.
        onSlidingStart={() => Keyboard.dismiss()}
        minimumTrackTintColor={colors.text}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.text}
      />
      {(lowLabel || highLabel) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: colors.textFaint }}>{lowLabel}</Text>
          <Text style={{ fontSize: 12, color: colors.textFaint }}>{highLabel}</Text>
        </View>
      )}
    </View>
  );
}
