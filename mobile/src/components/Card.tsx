import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
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
  },
});
