import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/theme/ThemeProvider';
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
  const textColor = variant === 'outline' ? colors.text : colors.accentText;
  const borderColor = variant === 'outline' ? colors.border : backgroundColor;

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
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
