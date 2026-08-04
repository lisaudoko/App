import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/spacing';

export type PillTone = 'success' | 'warning' | 'danger' | 'neutral';

export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  const { colors } = useAppTheme();
  // Sourced from statusColors — never hand-picked hex values here.
  const toneStyles: Record<PillTone, { bg: string; fg: string }> = {
    success: { bg: colors.statusColors.onTrack.bg, fg: colors.statusColors.onTrack.text },
    warning: { bg: colors.statusColors.borderline.bg, fg: colors.statusColors.borderline.text },
    danger: { bg: colors.statusColors.alert.bg, fg: colors.statusColors.alert.text },
    neutral: { bg: colors.statusColors.noLog.bg, fg: colors.statusColors.noLog.text },
  };
  const { bg, fg } = toneStyles[tone];

  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: fg }}>{label}</Text>
    </View>
  );
}
