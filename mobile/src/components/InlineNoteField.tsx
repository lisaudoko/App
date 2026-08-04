import React, { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props extends Omit<TextInputProps, 'placeholder'> {
  placeholder?: string;
  minHeight?: number;
}

/**
 * Underline-style note field (Prompt 8): unfocused = muted border-bottom,
 * focused = accent border-bottom, defaults to a "tap to add" placeholder
 * so an empty note field is never just blank space.
 */
export function InlineNoteField({ placeholder = 'Tap to add notes…', minHeight, onFocus, onBlur, style, ...props }: Props) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          borderBottomWidth: 1,
          borderBottomColor: focused ? colors.accent : colors.border,
          paddingVertical: 8,
          fontSize: 15,
          color: colors.text,
          minHeight,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        style,
      ]}
      {...props}
    />
  );
}
