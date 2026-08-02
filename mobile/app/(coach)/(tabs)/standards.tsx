import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { projectAtWeek } from '@/engine/projections';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';

export default function StandardsScreen() {
  const { colors } = useAppTheme();
  const { data, refresh } = useProgrammeData();
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(null);

  const meet = data.meets.find((m) => m.id === selectedMeetId) ?? data.meets[0];

  const byEvent = useMemo(() => {
    if (!meet) return [];
    const events = Array.from(new Set(data.athletes.map((a) => a.event)));
    return events
      .filter((event) => meet.standards[event] != null)
      .map((event) => ({
        event,
        standard: meet.standards[event],
        athletes: data.athletes.filter((a) => a.event === event),
      }));
  }, [data.athletes, meet]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Qualifying standards" subtitle={meet?.name} />
      <Screen onRefresh={refresh}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {data.meets.map((m) => {
              const active = m.id === meet?.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMeetId(m.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 11, color: active ? colors.accentText : colors.textMuted }}>{m.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {byEvent.map(({ event, standard, athletes }) => (
          <View key={event} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {event} · Standard {standard.toFixed(1)}m
            </Text>
            {athletes.map((athlete) => {
              const logs = data.weeklyLogs[athlete.id] ?? [];
              const projection = projectAtWeek(logs, 6);
              const gap = projection ? projection.mark - standard : null;
              const pct = projection ? projection.mark / standard : athlete.personalBest / standard;
              const tone = gap == null ? 'neutral' : gap >= 0 ? 'success' : gap >= -0.3 ? 'warning' : 'danger';
              const barColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.danger;

              return (
                <Pressable key={athlete.id} onPress={() => router.push(`/(coach)/athlete/${athlete.id}`)}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{athlete.name}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>
                          SB {athlete.personalBest}m{projection ? ` · Proj ${projection.mark.toFixed(1)}m` : ' · No data'}
                        </Text>
                      </View>
                      <Pill
                        label={gap == null ? 'No data' : gap >= 0 ? 'On track' : `${gap.toFixed(1)}m`}
                        tone={tone === 'neutral' ? 'neutral' : tone}
                      />
                    </View>
                    <ProgressBar pct={pct} color={barColor} />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Screen>
    </View>
  );
}
