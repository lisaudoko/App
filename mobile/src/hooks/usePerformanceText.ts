import { useEffect, useState } from 'react';
import { parsePerformanceText, performanceToInput, type PerformanceUnit } from '@/lib/formatPerformance';

/**
 * Text-state wrapper for a controlled result input whose stored value is a number. Keeping the typed
 * text separate means partial input like "1:" or "16." isn't rewritten while typing; the text only
 * resyncs when the stored value changes from somewhere other than this field.
 */
export function usePerformanceText(value: number | null, unit: PerformanceUnit, onChangeValue: (v: number | null) => void) {
  const [text, setText] = useState(() => performanceToInput(value, unit));

  useEffect(() => {
    const typed = parsePerformanceText(text, unit);
    const same = (value == null && typed == null) || (value != null && typed != null && Math.abs(value - typed) < 0.005);
    if (!same) setText(performanceToInput(value, unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unit]);

  return {
    text,
    onChangeText: (t: string) => {
      setText(t);
      onChangeValue(parsePerformanceText(t, unit));
    },
  };
}
