import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

export type PillTone = 'success' | 'warning' | 'danger' | 'neutral';

export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  const { colors } = useAppTheme();
  const toneStyles: Record<PillTone, { bg: string; fg: string }> = {
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    neutral: { bg: colors.border, fg: colors.textMuted },
  };
  const { bg, fg } = toneStyles[tone];

  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: fg }}>{label}</Text>
    </View>
  );
}
