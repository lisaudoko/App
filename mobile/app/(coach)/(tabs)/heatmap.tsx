import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { buildRpeRow, currentWeekFromLogs } from '@/engine/load';
import { detectAnomalies } from '@/engine/anomalies';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RpeHeatmapGrid } from '@/components/charts/RpeHeatmapGrid';
import { LoadingState } from '@/components/LoadingState';

const LEGEND: { label: string; bgKey: 'successBg' | 'warningBg' | 'dangerBg' | 'border'; fgKey: 'success' | 'warning' | 'danger' | 'textFaint' }[] = [
  { label: 'Low', bgKey: 'successBg', fgKey: 'success' },
  { label: 'Moderate', bgKey: 'warningBg', fgKey: 'warning' },
  { label: 'High', bgKey: 'dangerBg', fgKey: 'danger' },
  { label: 'Missing', bgKey: 'border', fgKey: 'textFaint' },
];

export default function HeatmapScreen() {
  const { colors } = useAppTheme();
  const { data, loading, refresh } = useProgrammeData();

  const currentWeek = useMemo(() => currentWeekFromLogs(data.weeklyLogs), [data.weeklyLogs]);

  const rows = useMemo(
    () =>
      data.athletes.map((a) => ({
        athleteId: a.id,
        name: a.name.split(' ')[0],
        cells: buildRpeRow(data.weeklyLogs[a.id] ?? [], 8, currentWeek),
      })),
    [data, currentWeek],
  );

  const flags = useMemo(
    () =>
      data.athletes.flatMap((a) =>
        detectAnomalies(a, data.weeklyLogs[a.id] ?? [], data.strengthTests[a.id] ?? [], currentWeek),
      ),
    [data, currentWeek],
  );

  if (loading) return <LoadingState />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Squad RPE heatmap" subtitle="Last 8 weeks" />
      <Screen onRefresh={refresh}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {LEGEND.map((l) => (
            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: colors[l.bgKey] }} />
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{l.label}</Text>
            </View>
          ))}
        </View>

        <RpeHeatmapGrid rows={rows} />

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 10 }}>This week&apos;s flags</Text>
          {flags.length === 0 && <Text style={{ fontSize: 12, color: colors.textMuted }}>No flags — squad looks steady.</Text>}
          {flags.map((f, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/(coach)/athlete/${f.athleteId}`)}
              style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}
            >
              <Text style={{ color: f.severity === 'danger' ? colors.danger : colors.warning }}>●</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}>
                {f.athleteName} — {f.message}
              </Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    </View>
  );
}
