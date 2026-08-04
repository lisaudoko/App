import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { detectAnomalies } from '@/engine/anomalies';
import { currentWeekFromLogs, buildRpeRow } from '@/engine/load';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingState } from '@/components/LoadingState';
import { RpeHeatmapGrid } from '@/components/charts/RpeHeatmapGrid';
import { EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';

const HEATMAP_LEGEND: { label: string; statusKey: 'onTrack' | 'borderline' | 'alert' | 'noLog' }[] = [
  { label: 'Low', statusKey: 'onTrack' },
  { label: 'Moderate', statusKey: 'borderline' },
  { label: 'High', statusKey: 'alert' },
  { label: 'Missing', statusKey: 'noLog' },
];

export function HeatmapScreen() {
  const { colors } = useAppTheme();
  const { data, loading, refresh } = useProgrammeData();
  const [activeEventGroup, setActiveEventGroup] = useState<EventGroup | null>(null);

  const currentWeek = useMemo(() => currentWeekFromLogs(data.weeklyLogs), [data.weeklyLogs]);

  const eventGroups = useMemo(() => {
    const set = new Set(data.athletes.map((a) => a.eventGroup).filter((g): g is EventGroup => !!g));
    return Array.from(set).sort();
  }, [data.athletes]);

  const filteredAthletes = useMemo(
    () => (activeEventGroup ? data.athletes.filter((a) => a.eventGroup === activeEventGroup) : data.athletes),
    [data.athletes, activeEventGroup],
  );

  const heatmapRows = useMemo(
    () =>
      filteredAthletes.map((a) => ({
        athleteId: a.id,
        name: a.name.split(' ')[0],
        cells: buildRpeRow(data.weeklyLogs[a.id] ?? [], 8, currentWeek),
      })),
    [filteredAthletes, data.weeklyLogs, currentWeek],
  );

  const heatmapFlags = useMemo(
    () =>
      filteredAthletes.flatMap((a) =>
        detectAnomalies(a, data.weeklyLogs[a.id] ?? [], data.strengthTests[a.id] ?? [], currentWeek),
      ),
    [filteredAthletes, data.weeklyLogs, data.strengthTests, currentWeek],
  );

  if (loading) return <LoadingState />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Heatmap" subtitle="RPE · Last 8 weeks" />

      {eventGroups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            {[null, ...eventGroups].map((g) => {
              const active = activeEventGroup === g;
              return (
                <Pressable
                  key={g ?? 'all-events'}
                  onPress={() => setActiveEventGroup(g)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={g ? EVENT_GROUP_LABEL[g] : 'All events'}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: active ? colors.text : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? colors.text : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.background : colors.textMuted }}>
                    {g ? EVENT_GROUP_LABEL[g] : 'All events'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Screen onRefresh={refresh}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {HEATMAP_LEGEND.map((l) => (
            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: colors.statusColors[l.statusKey].text }} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{l.label}</Text>
            </View>
          ))}
        </View>

        <RpeHeatmapGrid rows={heatmapRows} />

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 }}>This week&apos;s flags</Text>
          {heatmapFlags.length === 0 && <Text style={{ fontSize: 15, color: colors.textMuted }}>No flags — squad looks steady.</Text>}
          {heatmapFlags.map((f, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/(coach)/athlete/${f.athleteId}`)}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, minHeight: 24, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ color: f.severity === 'danger' ? colors.danger : colors.warning }}>●</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>
                {f.athleteName} — {f.message}
              </Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    </View>
  );
}
