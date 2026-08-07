import React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

export function Card({ style, ...props }: ViewProps) {
  const { colors, resolvedScheme } = useAppTheme();
  // Lighter shadow in dark mode so it doesn't fight the dark surface
  const shadowOpacity = resolvedScheme === 'dark' ? 0 : 0.07;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowOpacity,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    // Android
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
});
