import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { buildTrajectory } from '@/engine/projections';
import { acuteChronicRatio } from '@/engine/load';
import { estimatePeakTiming } from '@/engine/peakTiming';
import { pearsonCorrelation } from '@/engine/stats';
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

export default function CoachAthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data, loading, refresh } = useProgrammeData();

  const athlete = data.athletes.find((a) => a.id === id);
  const logs = data.weeklyLogs[id ?? ''] ?? [];
  const tests = data.strengthTests[id ?? ''] ?? [];

  const trajectory = useMemo(() => buildTrajectory(logs, 4), [logs]);
  const acRatio = useMemo(() => acuteChronicRatio(logs), [logs]);
  const peak = useMemo(() => estimatePeakTiming(logs), [logs]);

  const correlation = useMemo(() => {
    if (!athlete || tests.length < 2) return null;
    const t = tests.map((_, i) => i / (tests.length - 1));
    const marks = t.map((frac) => athlete.baselineMark + (athlete.personalBest - athlete.baselineMark) * frac);
    const r = pearsonCorrelation(
      tests.map((tt) => tt.squat),
      marks,
    );
    return { squats: tests.map((tt) => tt.squat), marks, r };
  }, [athlete, tests]);

  if (loading) return <LoadingState />;

  if (!athlete) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Athlete" onBack={() => router.back()} />
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
          This athlete couldn&apos;t be found.
        </Text>
      </View>
    );
  }

  const lastLog = logs[logs.length - 1];
  const avgRpe = logs.filter((l) => l.rpe != null).reduce((sum, l, _i, arr) => sum + (l.rpe as number) / arr.length, 0);
  const vsBaseline = (lastLog?.mark ?? athlete.personalBest) - athlete.baselineMark;

  const peakTone = peak.status === 'green' ? 'success' : peak.status === 'yellow' ? 'warning' : 'danger';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={athlete.name} subtitle={`${athlete.event} · Full report`} onBack={() => router.back()} />
      <Screen onRefresh={refresh}>
        <StatRow
          stats={[
            { label: 'Season best', value: `${athlete.personalBest}${athlete.unit}` },
            { label: 'vs baseline', value: `${vsBaseline >= 0 ? '+' : ''}${vsBaseline.toFixed(1)}${athlete.unit}`, color: vsBaseline >= 0 ? colors.success : colors.danger },
            { label: 'Avg RPE', value: avgRpe ? avgRpe.toFixed(1) : '—' },
          ]}
        />

        <Card>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Throw trajectory + projection</Text>
          <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>Solid = actual · Dotted = projected · Shaded = confidence band</Text>
          <TrajectoryChart actual={trajectory.actual} projected={trajectory.projected} standard={athlete.qualifyingStandard} unit={athlete.unit} />
        </Card>

        <Card>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Training load + RPE</Text>
          <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>Bars = volume load · Line = RPE · Red dashed = RPE 8 threshold</Text>
          <LoadRpeChart logs={logs} />
          {acRatio != null && (
            <Text style={{ fontSize: 10, color: acRatio > 1.3 ? colors.danger : colors.textMuted, marginTop: 4 }}>
              Acute:chronic ratio {acRatio.toFixed(1)}
              {acRatio > 1.3 ? ' — elevated, monitor this week' : ''}
            </Text>
          )}
        </Card>

        {tests.length >= 2 && (
          <Card>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Strength progression — test weeks</Text>
            <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>Key lift 1RM maxes across the season (lbs)</Text>
            <StrengthChart tests={tests} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <LegendDot color={colors.text} label="Squat" />
              <LegendDot color={colors.textMuted} label="Clean" />
              <LegendDot color={colors.textFaint} label="Bench" />
            </View>
          </Card>
        )}

        {correlation && (
          <Card>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Strength ↔ throw correlation</Text>
            <Text style={{ fontSize: 9, color: colors.textFaint, marginBottom: 4 }}>Squat max vs {athlete.event.toLowerCase()} mark · Each dot = test week</Text>
            <CorrelationChart xs={correlation.squats} ys={correlation.marks} r={correlation.r} xLabel="Squat (lbs)" />
            <Text style={{ fontSize: 10, color: Math.abs(correlation.r) >= 0.7 ? colors.success : colors.warning, marginTop: 4, fontWeight: '500' }}>
              {Math.abs(correlation.r) >= 0.7
                ? 'Strength gains are translating. Continue current approach.'
                : 'Strength and throws are diverging — consider a technical focus.'}
            </Text>
          </Card>
        )}

        <Card style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Peak timing indicator</Text>
            <Pill label={peak.headline} tone={peakTone} />
          </View>
          <View style={{ flex: 1.4 }}>
            {peak.detail.map((d) => (
              <Text key={d} style={{ fontSize: 11, color: colors.textMuted, lineHeight: 17 }}>
                {d}
              </Text>
            ))}
          </View>
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
