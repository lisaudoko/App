import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { AnimatedPressable } from './AnimatedPressable';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'outline' | 'muted';
}

export function Button({ label, onPress, loading, disabled, variant = 'primary' }: Props) {
  const { colors } = useAppTheme();

  const backgroundColor =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.danger
        : variant === 'muted'
          ? colors.border
          : 'transparent';

  const textColor =
    variant === 'outline' ? colors.accent : variant === 'muted' ? colors.textMuted : colors.accentText;
  const borderColor = variant === 'outline' ? colors.accent : backgroundColor;

  // Elevated shadow only on filled primary/danger buttons
  const hasShadow = variant === 'primary' || variant === 'danger';

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
        hasShadow && {
          shadowColor: backgroundColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: Platform.OS === 'android' ? 4 : 0,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    // Pill shape — more premium than a plain rectangle
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginTop: spacing.sm,
  },
  label: { fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
});
