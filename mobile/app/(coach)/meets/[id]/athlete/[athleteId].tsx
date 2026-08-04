import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import type { Athlete, MeetAttempt, MeetEntry } from '@/data/types';
import { EVENT_GROUP_DIRECTION, computeGap, formatPerformance, type PerformanceUnit } from '@/lib/formatPerformance';
import { bestLegalAttempt, deriveMeetEntryResult } from '@/engine/meetEntry';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { InlineNoteField } from '@/components/InlineNoteField';

const ATTEMPT_COUNT = 6;

function padAttempts(attempts: MeetAttempt[]): MeetAttempt[] {
  const byNumber = new Map(attempts.map((a) => [a.attempt, a]));
  return Array.from({ length: ATTEMPT_COUNT }, (_, i) => byNumber.get(i + 1) ?? { attempt: i + 1, mark: null, wind: null, foul: false, notes: '' });
}

export default function AthleteMeetEntryScreen() {
  const { colors } = useAppTheme();
  const { id, athleteId } = useLocalSearchParams<{ id: string; athleteId: string }>();

  const [entry, setEntry] = useState<MeetEntry | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [attempts, setAttempts] = useState<MeetAttempt[]>(padAttempts([]));
  const [technicalCues, setTechnicalCues] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [loading, setLoading] = useState(true);

  const attemptsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id || !athleteId) return;
    Promise.all([repository.getMeetEntryByAthlete(id, athleteId), repository.getAthlete(athleteId)]).then(([e, a]) => {
      setEntry(e);
      setAthlete(a ?? null);
      if (e) {
        setAttempts(padAttempts(e.attempts));
        setTechnicalCues(e.technicalCues ?? '');
        setCoachNotes(e.coachNotes ?? '');
        setNextSteps(e.nextSteps ?? '');
      }
      setLoading(false);
    });
  }, [id, athleteId]);

  const eventGroup = athlete?.eventGroup ?? 'throws';
  const direction = EVENT_GROUP_DIRECTION[eventGroup];
  const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';

  const bestMark = useMemo(() => bestLegalAttempt(attempts, direction), [attempts, direction]);
  const bestIndex = useMemo(() => {
    if (bestMark == null) return -1;
    return attempts.findIndex((a) => !a.foul && a.mark === bestMark);
  }, [attempts, bestMark]);

  const qualified = useMemo(() => {
    if (bestMark == null || !athlete?.qualifyingStandard) return false;
    return deriveMeetEntryResult(attempts, direction, athlete.qualifyingStandard).qualified;
  }, [attempts, direction, athlete]);

  const saveAttempts = useCallback(
    (next: MeetAttempt[]) => {
      if (!entry || !athlete) return;
      if (attemptsTimer.current) clearTimeout(attemptsTimer.current);
      attemptsTimer.current = setTimeout(() => {
        const { finalMark, qualified: q } = deriveMeetEntryResult(next, direction, athlete.qualifyingStandard || null);
        repository.updateMeetEntry(entry.id, { attempts: next, finalMark, qualified: q }).catch(() => {});
      }, 500);
    },
    [entry, athlete, direction],
  );

  function updateAttempt(index: number, patch: Partial<MeetAttempt>) {
    setAttempts((prev) => {
      const next = prev.map((a, i) => (i === index ? { ...a, ...patch } : a));
      saveAttempts(next);
      return next;
    });
  }

  function saveNotes(patch: Partial<{ technicalCues: string; coachNotes: string; nextSteps: string }>) {
    if (!entry) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      repository.updateMeetEntry(entry.id, patch).catch(() => {});
    }, 800);
  }

  if (loading) return <LoadingState />;
  if (!entry || !athlete) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Meet entry" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>This entry couldn&apos;t be found.</Text>
      </View>
    );
  }

  const seedGap = athlete.qualifyingStandard && entry.seedMark != null ? computeGap(entry.seedMark, athlete.qualifyingStandard, direction) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={athlete.name} subtitle={`${entry.event}${entry.bibNumber ? ` · Bib ${entry.bibNumber}` : ''}`} onBack={() => router.back()} />
      <Screen>
        {entry.seedMark != null && (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
            Seed: {formatPerformance(entry.seedMark, unit)}
            {seedGap != null ? ` · ${seedGap > 0 ? `${Math.abs(seedGap).toFixed(2)}${unit === 'seconds' ? 's' : 'm'} off standard` : 'already qualifying pace'}` : ''}
          </Text>
        )}

        {qualified && (
          <View style={{ backgroundColor: colors.successBg, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.success }}>✓ Qualified</Text>
          </View>
        )}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {attempts.map((a, i) => {
            const isBest = i === bestIndex;
            return (
              <View
                key={a.attempt}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 10,
                  borderBottomWidth: i === attempts.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                  backgroundColor: isBest ? colors.successBg : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, width: 18 }}>{a.attempt}</Text>
                <TextInput
                  value={a.mark != null ? String(a.mark) : ''}
                  onChangeText={(t) => updateAttempt(i, { mark: t ? parseFloat(t) : null })}
                  keyboardType="decimal-pad"
                  placeholder="mark"
                  placeholderTextColor={colors.textFaint}
                  style={{
                    flex: 1.2,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    fontSize: 14,
                    color: a.foul ? colors.textFaint : isBest ? colors.success : colors.text,
                    textDecorationLine: a.foul ? 'line-through' : 'none',
                  }}
                />
                <TextInput
                  value={a.wind ?? ''}
                  onChangeText={(t) => updateAttempt(i, { wind: t || null })}
                  placeholder="wind"
                  placeholderTextColor={colors.textFaint}
                  style={{ flex: 0.8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: colors.text }}
                />
                <Pressable
                  onPress={() => updateAttempt(i, { foul: !a.foul })}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: a.foul }}
                  accessibilityLabel={`Attempt ${a.attempt} foul`}
                  style={{ alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Foul</Text>
                  <Switch value={a.foul} onValueChange={(v) => updateAttempt(i, { foul: v })} trackColor={{ true: colors.danger, false: colors.border }} thumbColor={colors.surface} />
                </Pressable>
              </View>
            );
          })}
        </Card>

        <Card>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Technical observations</Text>
          <InlineNoteField
            value={technicalCues}
            onChangeText={(t) => {
              setTechnicalCues(t);
              saveNotes({ technicalCues: t });
            }}
            multiline
            minHeight={60}
          />
        </Card>

        <Card>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Coaching cues given</Text>
          <InlineNoteField
            value={coachNotes}
            onChangeText={(t) => {
              setCoachNotes(t);
              saveNotes({ coachNotes: t });
            }}
            multiline
            minHeight={60}
          />
        </Card>

        <Card>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Next steps / training focus</Text>
          <InlineNoteField
            value={nextSteps}
            onChangeText={(t) => {
              setNextSteps(t);
              saveNotes({ nextSteps: t });
            }}
            multiline
            minHeight={60}
          />
        </Card>

        <Card style={{ flexDirection: 'row' }}>
          <ComparisonCell label="Season best" value={athlete.personalBest > 0 ? formatPerformance(athlete.personalBest, unit) : '—'} colors={colors} />
          <ComparisonCell label="Today's best" value={bestMark != null ? formatPerformance(bestMark, unit) : '—'} colors={colors} />
          <ComparisonCell
            label="Delta"
            value={
              bestMark != null && athlete.personalBest > 0
                ? formatDelta(direction === 'higher_better' ? bestMark - athlete.personalBest : athlete.personalBest - bestMark, unit)
                : '—'
            }
            colors={colors}
          />
        </Card>
      </Screen>
    </View>
  );
}

function formatDelta(delta: number, unit: PerformanceUnit): string {
  const suffix = unit === 'seconds' ? 's' : 'm';
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}${suffix}`;
}

function ComparisonCell({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
