import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { buildTrajectory, projectAtWeek } from '@/engine/projections';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { StatRow } from '@/components/StatCard';
import { ProgressBar } from '@/components/ProgressBar';
import { TrajectoryChart } from '@/components/charts/TrajectoryChart';
import { LoadingState } from '@/components/LoadingState';
import { StaleBanner } from '@/components/StaleBanner';
import { EVENT_GROUP_DIRECTION, computeGap, formatPerformance, type PerformanceUnit } from '@/lib/formatPerformance';

export default function AthleteProgressScreen() {
  const { colors } = useAppTheme();
  const { data, loading, isStale, refresh } = useAthleteSelf();
  const { athlete, logs } = data;
  const direction = EVENT_GROUP_DIRECTION[athlete?.eventGroup ?? 'throws'];
  const perfUnit: PerformanceUnit = athlete?.unit === 's' ? 'seconds' : 'metres';

  const trajectory = useMemo(() => buildTrajectory(logs, 4, direction), [logs, direction]);
  const qualifyProjection = useMemo(() => projectAtWeek(logs, 6, direction), [logs, direction]);

  if (loading) return <LoadingState />;
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
    { label: 'Back squat', current: athlete.currentMaxes.squat, target: athlete.targetMaxes.squat, color: colors.text },
    { label: 'Power clean', current: athlete.currentMaxes.clean, target: athlete.targetMaxes.clean, color: colors.textMuted },
    { label: 'Wide bench', current: athlete.currentMaxes.bench, target: athlete.targetMaxes.bench, color: colors.textFaint },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="My progress" subtitle={athlete.name} />
      {isStale && <StaleBanner />}
      <Screen onRefresh={refresh}>
        <StatRow
          stats={[
            { label: 'Season best', value: hasBaseline ? formatPerformance(athlete.personalBest, perfUnit) : '—' },
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
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
            My {groupNoun} trajectory
          </Text>
          <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>{athlete.event} this season · Dotted = projection</Text>
          <TrajectoryChart
            actual={trajectory.actual}
            projected={trajectory.projected}
            standard={hasQualifyingStandard ? athlete.qualifyingStandard : undefined}
            unit={perfUnit}
          />
        </Card>

        <Card>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Strength snapshot</Text>
          {!hasMaxesSet && (
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
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
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{row.label}</Text>
                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '500' }}>
                      {row.current} / {row.target} lbs
                    </Text>
                  </View>
                  <ProgressBar pct={pct} color={barColor} />
                </View>
              );
            })}
        </Card>

        {!hasQualifyingStandard && (
          <Card>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Qualifying standard</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              Your coach hasn&apos;t set a qualifying standard for you yet.
            </Text>
          </Card>
        )}

        {hasQualifyingStandard && qualifyProjection && (
          <Card>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Qualifying standard</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Standard: {formatPerformance(athlete.qualifyingStandard, perfUnit)}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: hasQualified ? colors.success : colors.warning }}>
                {hasQualified ? 'Qualified' : `Need ${Math.abs(qualifyGap).toFixed(2)}${unitSuffix} more`}
              </Text>
            </View>
            <ProgressBar pct={qualifyPct} color={hasQualified ? colors.success : colors.warning} />
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 6 }}>
              Projected: {formatPerformance(qualifyProjection.mark, perfUnit)} in 6 weeks
            </Text>
          </Card>
        )}
      </Screen>
    </View>
  );
}
