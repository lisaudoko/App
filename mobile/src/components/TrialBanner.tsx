import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';

export function TrialBanner({ daysLeft }: { daysLeft: number | null }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => router.push('/(coach)/paywall')}
      accessibilityRole="button"
      accessibilityLabel={`Free trial, ${daysLeft ?? 0} day${daysLeft === 1 ? '' : 's'} remaining. Upgrade.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.accent,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 15, color: colors.accentText, flex: 1 }}>
        Free trial — {daysLeft ?? 0} day{daysLeft === 1 ? '' : 's'} remaining
      </Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accentText }}>Upgrade →</Text>
    </Pressable>
  );
}
