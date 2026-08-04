import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { EVENT_GROUP_EVENTS, EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

const ALL_GROUPS: EventGroup[] = ['throws', 'sprints', 'jumps'];

export default function OnboardingEventsScreen() {
  const { colors } = useAppTheme();
  const [selected, setSelected] = useState<EventGroup[]>([]);

  function toggle(group: EventGroup) {
    setSelected((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Welcome to TRU" subtitle="Step 1 of 2" />
      <Screen>
        <Text style={{ fontSize: 25, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
          What does your programme cover?
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 20, lineHeight: 18 }}>
          Pick every event group you coach. You can add more later from Settings.
        </Text>

        {ALL_GROUPS.map((group) => {
          const active = selected.includes(group);
          return (
            <Pressable
              key={group}
              onPress={() => toggle(group)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${EVENT_GROUP_LABEL[group]}: ${EVENT_GROUP_EVENTS[group].join(', ')}`}
            >
              <Card
                style={{
                  borderColor: active ? colors.accent : colors.border,
                  borderWidth: active ? 2 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text }}>{EVENT_GROUP_LABEL[group]}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {EVENT_GROUP_EVENTS[group].join(', ')}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: active ? 0 : 1.5,
                    borderColor: colors.border,
                    backgroundColor: active ? colors.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active && <Text style={{ color: colors.accentText, fontSize: 15, fontWeight: '700' }}>✓</Text>}
                </View>
              </Card>
            </Pressable>
          );
        })}

        <Button
          label="Continue"
          disabled={selected.length === 0}
          onPress={() => router.push({ pathname: '/(coach)/onboarding/config', params: { groups: selected.join(',') } })}
        />
      </Screen>
    </View>
  );
}
