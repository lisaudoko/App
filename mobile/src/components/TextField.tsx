import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({ label, error, style, ...props }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surfaceAlt, color: colors.text },
          style,
        ]}
        {...props}
      />
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  error: { fontSize: 11, marginTop: 4 },
});
