import React from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import type { EventGroup } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EventConfigForm, type EventConfigFormValue } from '@/components/EventConfigForm';

export default function OnboardingConfigScreen() {
  const { colors } = useAppTheme();
  const { groups } = useLocalSearchParams<{ groups: string }>();
  const eventGroups = (groups ?? '').split(',').filter(Boolean) as EventGroup[];

  async function handleSave(value: EventConfigFormValue) {
    await repository.saveProgrammeConfig({ eventGroups, ...value });
    router.replace('/(coach)/onboarding/done');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Configure your programme" subtitle="Step 2 of 2" onBack={() => router.back()} />
      <Screen>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
          Set qualifying standards, competition date, and how each group trains. You can change any of this later
          from Settings.
        </Text>
        <EventConfigForm eventGroups={eventGroups} initial={null} onSave={handleSave} saveLabel="Finish setup" />
      </Screen>
    </View>
  );
}
