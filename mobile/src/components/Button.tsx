import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { AnimatedPressable } from './AnimatedPressable';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'outline';
}

export function Button({ label, onPress, loading, disabled, variant = 'primary' }: Props) {
  const { colors } = useAppTheme();

  const backgroundColor =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : 'transparent';
  // Secondary/ghost buttons are accent-bordered with an accent label — never bare text with no container.
  const textColor = variant === 'outline' ? colors.accent : colors.accentText;
  const borderColor = variant === 'outline' ? colors.accent : backgroundColor;

  return (
    <AnimatedPressable
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.btn,
        { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  label: { fontSize: 18, fontWeight: '600' },
});
