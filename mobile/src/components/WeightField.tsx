import React, { useEffect, useState } from 'react';
import { TextField } from '@/components/TextField';
import { displayToLbs, lbsToDisplay, type WeightUnit } from '@/lib/weightUnits';

interface Props {
  label: string;
  /** Stored value, always in lbs. */
  lbs: number | null;
  /** Called with the typed value converted back to lbs (null when the field is empty or unparseable). */
  onChangeLbs: (lbs: number | null) => void;
  unit: WeightUnit;
  placeholder?: string;
}

/**
 * A weight input that shows/accepts the viewer's unit while the data stays in lbs. It keeps its own text
 * so converting back and forth never rewrites what's being typed (e.g. "2." in kg would otherwise snap
 * back to "2" and make decimals impossible to enter).
 */
export function WeightField({ label, lbs, onChangeLbs, unit, placeholder }: Props) {
  const toText = (value: number | null) => (value != null ? String(lbsToDisplay(value, unit)) : '');
  const [text, setText] = useState(() => toText(lbs));

  // Resync only when the stored value or unit changed from outside — not as a result of typing.
  useEffect(() => {
    const parsed = parseFloat(text);
    const typedLbs = text.trim() !== '' && Number.isFinite(parsed) ? displayToLbs(parsed, unit) : null;
    const same = (lbs == null && typedLbs == null) || (lbs != null && typedLbs != null && Math.abs(lbs - typedLbs) < 0.05);
    if (!same) setText(toText(lbs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbs, unit]);

  return (
    <TextField
      label={label}
      keyboardType="decimal-pad"
      value={text}
      placeholder={placeholder}
      onChangeText={(t) => {
        setText(t);
        const parsed = parseFloat(t);
        onChangeLbs(t.trim() === '' || !Number.isFinite(parsed) ? null : displayToLbs(parsed, unit));
      }}
    />
  );
}
