import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

/** Centered spinner for the brief window while a data-gated screen's first fetch resolves. */
export function LoadingState() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.textMuted} />
    </View>
  );
}
