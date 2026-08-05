import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { repository } from '@/data/repository';
import type { AthleteNote, Meet, MeetEntry } from '@/data/types';
import { buildTrajectory } from '@/engine/projections';
import { acuteChronicRatio } from '@/engine/load';
import { estimatePeakTiming } from '@/engine/peakTiming';
import { pearsonCorrelation } from '@/engine/stats';
import { estimateWeekForDate } from '@/engine/meetEntry';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { StatRow } from '@/components/StatCard';
import { LoadingState } from '@/components/LoadingState';
import { TrajectoryChart } from '@/components/charts/TrajectoryChart';
import { LoadRpeChart } from '@/components/charts/LoadRpeChart';
import { StrengthChart } from '@/components/charts/StrengthChart';
import { CorrelationChart } from '@/components/charts/CorrelationChart';
import { EVENT_GROUP_DIRECTION, formatPerformance, isBetter, type PerformanceUnit } from '@/lib/formatPerformance';

export default function CoachAthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data, loading, refresh } = useProgrammeData();
  const [meetResults, setMeetResults] = useState<{ entry: MeetEntry; meet: Meet }[]>([]);
  const [notes, setNotes] = useState<AthleteNote[]>([]);

  const athlete = data.athletes.find((a) => a.id === id);
  const logs = data.weeklyLogs[id ?? ''] ?? [];
  const tests = data.strengthTests[id ?? ''] ?? [];
  const direction = EVENT_GROUP_DIRECTION[athlete?.eventGroup ?? 'throws'];
  const perfUnit: PerformanceUnit = athlete?.unit === 's' ? 'seconds' : 'metres';

  useEffect(() => {
    if (!id) return;
    repository.getMeetResultsForAthlete(id).then(setMeetResults).catch(() => {});
    repository.getAthleteNotes({ athleteId: id }).then(setNotes).catch(() => {});
  }, [id]);

  const meetPoints = useMemo(
    () =>
      meetResults
        .filter((r) => r.entry.finalMark != null)
        .map((r) => ({
          week: estimateWeekForDate(logs, r.meet.date),
          mark: r.entry.finalMark as number,
          meetName: r.meet.name,
          date: r.meet.date,
        })),
    [meetResults, logs],
  );

  const competitionBest = useMemo(() => {
    let best: number | null = null;
    for (const r of meetResults) {
      if (r.entry.finalMark == null) continue;
      if (best == null || isBetter(r.entry.finalMark, best, direction)) best = r.entry.finalMark;
    }
    return best;
  }, [meetResults, direction]);

  const trajectory = useMemo(() => buildTrajectory(logs, 4, direction), [logs, direction]);
  const acRatio = useMemo(() => acuteChronicRatio(logs), [logs]);
  const peak = useMemo(() => estimatePeakTiming(logs, direction), [logs, direction]);

  const correlation = useMemo(() => {
    if (!athlete || tests.length < 2) return null;
    const loggedWeeks = logs.filter((l) => l.mark != null && l.loggedAt);
    if (loggedWeeks.length < 2) return null;

    // Match each strength test to the closest-dated weekly throw.
    const paired = tests
      .map((test) => {
        const testTime = new Date(test.date).getTime();
        let closest: (typeof loggedWeeks)[number] | null = null;
        let closestDiff = Infinity;
        for (const log of loggedWeeks) {
          const diff = Math.abs(new Date(log.loggedAt as string).getTime() - testTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = log;
          }
        }
        return closest ? { squat: test.squat, mark: closest.mark as number } : null;
      })
      .filter((p): p is { squat: number; mark: number } => p != null);

    if (paired.length < 2) return null;
    const r = pearsonCorrelation(
      paired.map((p) => p.squat),
      paired.map((p) => p.mark),
    );
    return { squats: paired.map((p) => p.squat), marks: paired.map((p) => p.mark), r };
  }, [athlete, tests, logs]);

  if (loading) return <LoadingState />;

  if (!athlete) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Athlete" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
          This athlete couldn&apos;t be found.
        </Text>
      </View>
    );
  }

  const lastLog = logs[logs.length - 1];
  const avgRpe = logs.filter((l) => l.rpe != null).reduce((sum, l, _i, arr) => sum + (l.rpe as number) / arr.length, 0);
  const latestMark = lastLog?.mark ?? athlete.personalBest;
  const vsBaseline = direction === 'higher_better' ? latestMark - athlete.baselineMark : athlete.baselineMark - latestMark;
  const unitSuffix = perfUnit === 'seconds' ? 's' : 'm';

  const peakTone = peak.status === 'green' ? 'success' : peak.status === 'yellow' ? 'warning' : 'danger';
  const groupNoun = athlete.eventGroup === 'sprints' ? 'time' : athlete.eventGroup === 'jumps' ? 'jump' : 'throw';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={athlete.name}
        subtitle={`${athlete.event} · Full report`}
        onBack={() => router.back()}
        rightIcon="create-outline"
        onRightPress={() => router.push(`/(coach)/athlete/${athlete.id}/edit`)}
        rightLabel="Edit athlete"
      />
      <Screen onRefresh={refresh}>
        <StatRow
          stats={[
            { label: 'Season best', value: formatPerformance(athlete.personalBest, perfUnit) },
            competitionBest != null
              ? { label: 'Competition best', value: formatPerformance(competitionBest, perfUnit), color: colors.success }
              : { label: 'Competition best', value: '—' },
            { label: 'vs baseline', value: `${vsBaseline >= 0 ? '+' : ''}${vsBaseline.toFixed(2)}${unitSuffix}`, color: vsBaseline >= 0 ? colors.success : colors.danger },
          ]}
        />
        <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: -8, marginBottom: 12 }}>Avg RPE: {avgRpe ? avgRpe.toFixed(1) : '—'}</Text>

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {groupNoun.charAt(0).toUpperCase() + groupNoun.slice(1)} trajectory + projection
          </Text>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>
            Solid = actual · Dotted = projected · Shaded = confidence band · ■ = meet result
          </Text>
          <TrajectoryChart actual={trajectory.actual} projected={trajectory.projected} standard={athlete.qualifyingStandard} unit={perfUnit} meetPoints={meetPoints} direction={direction} />
        </Card>

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Training load + RPE</Text>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>Bars = volume load · Line = RPE · Red dashed = RPE 8 threshold</Text>
          <LoadRpeChart logs={logs} />
          {acRatio != null && (
            <Text style={{ fontSize: 12, color: acRatio > 1.3 ? colors.danger : colors.textMuted, marginTop: 4 }}>
              Acute:chronic ratio {acRatio.toFixed(1)}
              {acRatio > 1.3 ? ' — elevated, monitor this week' : ''}
            </Text>
          )}
        </Card>

        {tests.length >= 2 && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Strength progression — test weeks</Text>
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>Key lift 1RM maxes across the season (lbs)</Text>
            <StrengthChart tests={tests} thirdLift={athlete.eventGroup === 'jumps' ? 'deadlift' : 'bench'} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <LegendDot color={colors.text} label="Squat" />
              <LegendDot color={colors.textMuted} label="Clean" />
              <LegendDot color={colors.textFaint} label={athlete.eventGroup === 'jumps' ? 'RDL' : 'Bench'} />
            </View>
          </Card>
        )}

        {correlation && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Strength ↔ {groupNoun} correlation</Text>
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>Squat max vs {athlete.event.toLowerCase()} mark · Each dot = test week</Text>
            <CorrelationChart xs={correlation.squats} ys={correlation.marks} r={correlation.r} xLabel="Squat (lbs)" />
            <Text style={{ fontSize: 12, color: Math.abs(correlation.r) >= 0.7 ? colors.success : colors.warning, marginTop: 4, fontWeight: '500' }}>
              {Math.abs(correlation.r) >= 0.7
                ? 'Strength gains are translating. Continue current approach.'
                : `Strength and ${groupNoun}s are diverging — consider a technical focus.`}
            </Text>
          </Card>
        )}

        <Card style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Peak timing indicator</Text>
            <Pill label={peak.headline} tone={peakTone} />
          </View>
          <View style={{ flex: 1.4 }}>
            {peak.detail.map((d) => (
              <Text key={d} style={{ fontSize: 13, color: colors.textMuted, lineHeight: 17 }}>
                {d}
              </Text>
            ))}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Notes</Text>
            <Pressable
              onPress={() => router.push(`/(coach)/(tabs)/notes?athleteId=${athlete.id}`)}
              accessibilityRole="button"
              accessibilityLabel="See all notes"
            >
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>See all</Text>
            </Pressable>
          </View>
          {notes.length === 0 && <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 10 }}>No notes yet for this athlete.</Text>}
          {notes.slice(0, 3).map((note) => (
            <View key={note.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.textFaint }}>
                  {note.noteDate} · {note.noteType.charAt(0).toUpperCase() + note.noteType.slice(1)}
                </Text>
                {note.flagFollowup && <Text style={{ fontSize: 12 }}>🚩</Text>}
              </View>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                {note.body}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={() => router.push(`/(coach)/(tabs)/notes?athleteId=${athlete.id}&new=1`)}
            accessibilityRole="button"
            accessibilityLabel="Add note"
            style={({ pressed }) => [{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              alignSelf: 'flex-start',
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
            <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>Add note</Text>
          </Pressable>
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
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}
