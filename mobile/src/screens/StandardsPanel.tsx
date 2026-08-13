import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { projectAtWeek } from '@/engine/projections';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { LoadingState } from '@/components/LoadingState';
import { EVENT_GROUP_DIRECTION, computeGap, formatPerformance, type EventGroup, type PerformanceUnit } from '@/lib/formatPerformance';

/** Qualifying standards, now embedded as the "Standards" pane of the Meets tab (Prompt 8) rather than its own tab. */
export function StandardsPanel() {
  const { colors } = useAppTheme();
  const { data, loading } = useProgrammeData();
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(null);

  const meet = data.meets.find((m) => m.id === selectedMeetId) ?? data.meets[0];

  const byEvent = useMemo(() => {
    if (!meet) return [];
    const events = Array.from(new Set(data.athletes.map((a) => a.event)));
    return events
      .filter((event) => meet.standards[event] != null)
      .map((event) => {
        const athletes = data.athletes.filter((a) => a.event === event);
        const eventGroup: EventGroup = athletes[0]?.eventGroup ?? 'throws';
        return { event, standard: meet.standards[event], athletes, eventGroup };
      });
  }, [data.athletes, meet]);

  if (loading) return <LoadingState />;

  if (data.meets.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
        <Ionicons name="trophy-outline" size={32} color={colors.textFaint} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
          No meets yet
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
          Add your season&apos;s competitions and qualifying standards from the Schedule tab to see athletes tracked against them.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginBottom: 16, flexGrow: 0 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {data.meets.map((m) => {
            const active = m.id === meet?.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setSelectedMeetId(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={m.name}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: active ? colors.accent : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 13, color: active ? colors.accentText : colors.textMuted }}>{m.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {byEvent.length === 0 && (
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 24 }}>
          This meet has no standards matching your athletes&apos; events yet.
        </Text>
      )}
      {byEvent.map(({ event, standard, athletes, eventGroup }) => {
        const direction = EVENT_GROUP_DIRECTION[eventGroup];
        const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';
        return (
          <View key={event} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {event} · Standard {formatPerformance(standard, unit)}
            </Text>
            {athletes.map((athlete) => {
              const logs = data.weeklyLogs[athlete.id] ?? [];
              const projection = projectAtWeek(logs, 6, direction);
              // Positive = still needs to close this much of a gap; <=0 = already there.
              const gap = projection ? computeGap(projection.mark, standard, direction) : null;
              const pct = projection
                ? direction === 'higher_better'
                  ? projection.mark / standard
                  : standard / projection.mark
                : direction === 'higher_better'
                  ? athlete.personalBest / standard
                  : standard / athlete.personalBest;
              const tone = gap == null ? 'neutral' : gap <= 0 ? 'success' : gap <= 0.3 ? 'warning' : 'danger';
              const barColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.danger;

              return (
                <Pressable
                  key={athlete.id}
                  onPress={() => router.push(`/(coach)/athlete/${athlete.id}`)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '500', color: colors.text }} numberOfLines={1}>{athlete.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                          SB {formatPerformance(athlete.personalBest, unit)}
                          {projection ? ` · Proj ${formatPerformance(projection.mark, unit)}` : ' · No data'}
                        </Text>
                      </View>
                      <Pill
                        label={gap == null ? 'No data' : gap <= 0 ? 'On track' : `${gap.toFixed(2)}${unit === 'seconds' ? 's' : 'm'}`}
                        tone={tone === 'neutral' ? 'neutral' : tone}
                      />
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
                    </View>
                    <ProgressBar pct={pct} color={barColor} />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
