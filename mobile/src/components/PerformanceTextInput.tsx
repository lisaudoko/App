import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { usePerformanceText } from '@/hooks/usePerformanceText';
import { performanceKeyboard, type PerformanceUnit } from '@/lib/formatPerformance';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number | null;
  unit: PerformanceUnit;
  onChangeValue: (value: number | null) => void;
}

/** A bare result input for a stored number: accepts 16.42 for metres and 10.82 or 1:48.30 for seconds. */
export function PerformanceTextInput({ value, unit, onChangeValue, ...rest }: Props) {
  const { text, onChangeText } = usePerformanceText(value, unit, onChangeValue);
  return <TextInput {...rest} value={text} onChangeText={onChangeText} keyboardType={performanceKeyboard(unit)} />;
}
