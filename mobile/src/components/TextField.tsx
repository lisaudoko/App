import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/spacing';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  /** Adds a show/hide eye toggle; only meaningful alongside secureTextEntry. */
  revealable?: boolean;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, style, revealable, secureTextEntry, ...props },
  ref,
) {
  const { colors } = useAppTheme();
  const [reveal, setReveal] = useState(false);

  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={revealable ? !reveal : secureTextEntry}
          style={[
            styles.input,
            { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surfaceAlt, color: colors.text },
            revealable && { paddingRight: 40 },
            style,
          ]}
          {...props}
        />
        {revealable && (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            hitSlop={8}
            style={{ position: 'absolute', right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textFaint} />
          </Pressable>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { fontSize: 15, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 18,
  },
  error: { fontSize: 13, marginTop: 4 },
});
