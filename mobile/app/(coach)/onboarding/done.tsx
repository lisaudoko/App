import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';

export default function OnboardingDoneScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 50, textAlign: 'center' }}>🏁</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12, textAlign: 'center' }}>
          You&apos;re all set
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
          Your programme is configured. Add your athletes to get started.
        </Text>
        <Button label="Go to squad" onPress={() => router.replace('/(coach)/(tabs)')} />
        <Button
          label="Add an athlete"
          variant="outline"
          onPress={() => {
            router.replace('/(coach)/(tabs)');
            router.push('/(coach)/add-athlete');
          }}
        />
      </Screen>
    </View>
  );
}
