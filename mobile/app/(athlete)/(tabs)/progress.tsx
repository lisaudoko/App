import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { repository } from '@/data/repository';
import type { Meet, MeetEntry } from '@/data/types';
import { buildTrajectory, projectAtWeek } from '@/engine/projections';
import { estimateWeekForDate } from '@/engine/meetEntry';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { StatRow } from '@/components/StatCard';
import { ProgressBar } from '@/components/ProgressBar';
import { TrajectoryChart } from '@/components/charts/TrajectoryChart';
import { StrengthChart } from '@/components/charts/StrengthChart';
import { CorrelationChart } from '@/components/charts/CorrelationChart';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { StaleBanner } from '@/components/StaleBanner';
import { pearsonCorrelation } from '@/engine/stats';
import { EVENT_GROUP_DIRECTION, computeGap, formatPerformance, isBetter, type PerformanceUnit } from '@/lib/formatPerformance';

export default function AthleteProgressScreen() {
  const { colors } = useAppTheme();
  const { data, loading, isStale, error, refresh } = useAthleteSelf();
  const { athlete, logs, tests } = data;
  const direction = EVENT_GROUP_DIRECTION[athlete?.eventGroup ?? 'throws'];
  const perfUnit: PerformanceUnit = athlete?.unit === 's' ? 'seconds' : 'metres';
  const [meetResults, setMeetResults] = useState<{ entry: MeetEntry; meet: Meet }[]>([]);

  useEffect(() => {
    repository.getMyMeetEntries().then(setMeetResults).catch(() => {});
  }, []);

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
  const qualifyProjection = useMemo(() => projectAtWeek(logs, 6, direction), [logs, direction]);

  const correlation = useMemo(() => {
    if (tests.length < 2) return null;
    const loggedWeeks = logs.filter((l) => l.mark != null && l.loggedAt);
    if (loggedWeeks.length < 2) return null;

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
  }, [tests, logs]);

  if (loading) return <LoadingState />;
  if (error && !athlete) return <ErrorState onRetry={refresh} />;
  if (!athlete) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const hasBaseline = athlete.personalBest > 0;
  const hasQualifyingStandard = athlete.qualifyingStandard > 0;
  const hasMaxesSet = athlete.currentMaxes.squat > 0 && athlete.currentMaxes.clean > 0 && athlete.currentMaxes.bench > 0;

  const lastLog = logs[logs.length - 1];
  const latestMark = lastLog?.mark ?? athlete.personalBest;
  const vsBaseline = direction === 'higher_better' ? latestMark - athlete.baselineMark : athlete.baselineMark - latestMark;
  const unitSuffix = perfUnit === 'seconds' ? 's' : 'm';
  // Positive = still needs to close this much of a gap; negative/zero = already qualified.
  const qualifyGap = computeGap(athlete.personalBest, athlete.qualifyingStandard, direction);
  const hasQualified = qualifyGap <= 0;
  const qualifyPct = direction === 'higher_better'
    ? athlete.personalBest / athlete.qualifyingStandard
    : athlete.qualifyingStandard / athlete.personalBest;
  const groupNoun = athlete.eventGroup === 'sprints' ? 'time' : athlete.eventGroup === 'jumps' ? 'jump' : 'throw';

  const strengthRows = [
    { label: 'Squat', current: athlete.currentMaxes.squat, target: athlete.targetMaxes.squat, color: colors.text },
    { label: 'Clean', current: athlete.currentMaxes.clean, target: athlete.targetMaxes.clean, color: colors.textMuted },
    { label: 'Bench', current: athlete.currentMaxes.bench, target: athlete.targetMaxes.bench, color: colors.textFaint },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="My progress" subtitle={athlete.name} />
      {isStale && <StaleBanner />}
      <Screen onRefresh={refresh}>
        <StatRow
          stats={[
            { label: 'Season best', value: hasBaseline ? formatPerformance(athlete.personalBest, perfUnit) : '—' },
            competitionBest != null
              ? { label: 'Competition best', value: formatPerformance(competitionBest, perfUnit), color: colors.success }
              : { label: 'Competition best', value: '—' },
            {
              label: 'vs baseline',
              value: hasBaseline ? `${vsBaseline >= 0 ? '+' : ''}${vsBaseline.toFixed(2)}${unitSuffix}` : '—',
              color: hasBaseline ? (vsBaseline >= 0 ? colors.success : colors.danger) : undefined,
            },
            {
              label: 'to qualify',
              value: hasBaseline && hasQualifyingStandard ? `${hasQualified ? '+' : '−'}${Math.abs(qualifyGap).toFixed(2)}${unitSuffix}` : '—',
              color: hasBaseline && hasQualifyingStandard ? (hasQualified ? colors.success : colors.warning) : undefined,
            },
          ]}
        />

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            My {groupNoun} trajectory
          </Text>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>
            {athlete.event} this season · Dotted = projection · ■ = meet result
          </Text>
          <TrajectoryChart
            actual={trajectory.actual}
            projected={trajectory.projected}
            standard={hasQualifyingStandard ? athlete.qualifyingStandard : undefined}
            unit={perfUnit}
            meetPoints={meetPoints}
            direction={direction}
          />
        </Card>

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Strength snapshot</Text>
          {!hasMaxesSet && (
            <Text style={{ fontSize: 15, color: colors.textMuted }}>
              Your coach hasn&apos;t entered your lift maxes yet.
            </Text>
          )}
          {hasMaxesSet &&
            strengthRows.map((row) => {
              const pct = row.target > 0 ? row.current / row.target : 0;
              const barColor = pct >= 0.9 ? colors.success : pct >= 0.7 ? colors.warning : colors.textFaint;
              return (
                <View key={row.label} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                      {row.current} / {row.target} lbs
                    </Text>
                  </View>
                  <ProgressBar pct={pct} color={barColor} />
                </View>
              );
            })}
        </Card>

        {tests.length >= 3 && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Strength progression</Text>
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>1RM maxes across test dates (lbs)</Text>
            <StrengthChart tests={tests} thirdLift={athlete.eventGroup === 'jumps' ? 'deadlift' : 'bench'} />
          </Card>
        )}

        {correlation && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Strength ↔ {groupNoun} correlation</Text>
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>Squat max vs {athlete.event.toLowerCase()} mark · Each dot = test week</Text>
            <CorrelationChart xs={correlation.squats} ys={correlation.marks} r={correlation.r} xLabel="Squat (lbs)" />
            <Text style={{ fontSize: 12, color: Math.abs(correlation.r) >= 0.7 ? colors.success : colors.warning, marginTop: 4, fontWeight: '500' }}>
              {Math.abs(correlation.r) >= 0.7
                ? 'Your strength gains are translating well.'
                : `Strength and ${groupNoun}s are diverging — worth flagging to your coach.`}
            </Text>
          </Card>
        )}

        {!hasQualifyingStandard && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Qualifying standard</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>
              Your coach hasn&apos;t set a qualifying standard for you yet.
            </Text>
          </Card>
        )}

        {hasQualifyingStandard && qualifyProjection && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Qualifying standard</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 15, color: colors.textMuted }}>
                Standard: {formatPerformance(athlete.qualifyingStandard, perfUnit)}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: hasQualified ? colors.success : colors.warning }}>
                {hasQualified ? 'Qualified' : `Need ${Math.abs(qualifyGap).toFixed(2)}${unitSuffix} more`}
              </Text>
            </View>
            <ProgressBar pct={qualifyPct} color={hasQualified ? colors.success : colors.warning} />
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
              Projected: {formatPerformance(qualifyProjection.mark, perfUnit)} in 6 weeks
            </Text>
          </Card>
        )}
      </Screen>
    </View>
  );
}
