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

export default function AthleteProgressScreen() {
  const { colors } = useAppTheme();
  const { data, loading, isStale, refresh } = useAthleteSelf();
  const { athlete, logs } = data;

  const trajectory = useMemo(() => buildTrajectory(logs, 4), [logs]);
  const qualifyProjection = useMemo(() => projectAtWeek(logs, 6), [logs]);

  if (loading) return <LoadingState />;
  if (!athlete) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const hasBaseline = athlete.personalBest > 0;
  const hasQualifyingStandard = athlete.qualifyingStandard > 0;
  const hasMaxesSet = athlete.currentMaxes.squat > 0 && athlete.currentMaxes.clean > 0 && athlete.currentMaxes.bench > 0;

  const lastLog = logs[logs.length - 1];
  const vsBaseline = (lastLog?.mark ?? athlete.personalBest) - athlete.baselineMark;
  const gapToQualify = athlete.personalBest - athlete.qualifyingStandard;

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
            { label: 'Season best', value: hasBaseline ? `${athlete.personalBest}${athlete.unit}` : '—' },
            {
              label: 'vs baseline',
              value: hasBaseline ? `${vsBaseline >= 0 ? '+' : ''}${vsBaseline.toFixed(1)}${athlete.unit}` : '—',
              color: hasBaseline ? (vsBaseline >= 0 ? colors.success : colors.danger) : undefined,
            },
            {
              label: 'to qualify',
              value: hasBaseline && hasQualifyingStandard ? `${gapToQualify >= 0 ? '+' : ''}${gapToQualify.toFixed(1)}${athlete.unit}` : '—',
              color: hasBaseline && hasQualifyingStandard ? (gapToQualify >= 0 ? colors.success : colors.warning) : undefined,
            },
          ]}
        />

        <Card>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>My throw trajectory</Text>
          <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>{athlete.event} this season · Dotted = projection</Text>
          <TrajectoryChart
            actual={trajectory.actual}
            projected={trajectory.projected}
            standard={hasQualifyingStandard ? athlete.qualifyingStandard : undefined}
            unit={athlete.unit}
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
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Standard: {athlete.qualifyingStandard}{athlete.unit}</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: gapToQualify >= 0 ? colors.success : colors.warning }}>
                {gapToQualify >= 0 ? 'Qualified' : `Need +${Math.abs(gapToQualify).toFixed(1)}${athlete.unit}`}
              </Text>
            </View>
            <ProgressBar pct={athlete.personalBest / athlete.qualifyingStandard} color={gapToQualify >= 0 ? colors.success : colors.warning} />
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 6 }}>
              Projected: {qualifyProjection.mark.toFixed(1)}{athlete.unit} in 6 weeks
            </Text>
          </Card>
        )}
      </Screen>
    </View>
  );
}
