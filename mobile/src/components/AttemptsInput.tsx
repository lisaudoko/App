import React from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';

export interface AttemptRow {
  result: string;
  wind: string;
  foul: boolean;
}

export const MAX_ATTEMPTS = 10;

export function emptyAttemptRows(count: number): AttemptRow[] {
  return Array.from({ length: count }, () => ({ result: '', wind: '', foul: false }));
}

interface Props {
  rows: AttemptRow[];
  onChange: (rows: AttemptRow[]) => void;
  /** "Attempt" for field events, "Run" for sprints. */
  unitNoun: string;
  /** What a failed attempt is called for this event: Foul, False start or Miss. */
  failLabel: string;
  resultPlaceholder: string;
  keyboardType: 'decimal-pad' | 'numbers-and-punctuation';
  showWind: boolean;
  /** Index of the attempt currently counted as the best legal one, for highlighting. */
  bestIndex: number | null;
}

/** One row per attempt/run — result, optional wind, and a foul/false start/miss switch. */
export function AttemptsInput({ rows, onChange, unitNoun, failLabel, resultPlaceholder, keyboardType, showWind, bestIndex }: Props) {
  const { colors } = useAppTheme();

  function update(i: number, patch: Partial<AttemptRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <View>
      {rows.map((row, i) => {
        const isBest = i === bestIndex;
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1,
              borderBottomColor: colors.border,
              backgroundColor: isBest ? colors.successBg : 'transparent',
              borderRadius: 6,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, width: 18 }} accessibilityLabel={`${unitNoun} ${i + 1}`}>
              {i + 1}
            </Text>
            <TextInput
              value={row.result}
              onChangeText={(t) => update(i, { result: t })}
              keyboardType={keyboardType}
              placeholder={resultPlaceholder}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={`${unitNoun} ${i + 1} result`}
              style={{
                flex: 1.3,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 8,
                fontSize: 15,
                color: row.foul ? colors.textFaint : isBest ? colors.success : colors.text,
                textDecorationLine: row.foul ? 'line-through' : 'none',
              }}
            />
            {showWind && (
              <TextInput
                value={row.wind}
                onChangeText={(t) => update(i, { wind: t })}
                keyboardType="numbers-and-punctuation"
                placeholder="wind"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel={`${unitNoun} ${i + 1} wind in metres per second`}
                style={{ flex: 0.8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, color: colors.text }}
              />
            )}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{failLabel}</Text>
              <Switch
                value={row.foul}
                onValueChange={(v) => update(i, { foul: v })}
                trackColor={{ true: colors.danger, false: colors.border }}
                thumbColor={colors.text}
                accessibilityLabel={`${unitNoun} ${i + 1} ${failLabel}`}
              />
            </View>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={`Add ${unitNoun.toLowerCase()}`}
            variant="outline"
            onPress={() => onChange([...rows, { result: '', wind: '', foul: false }])}
            disabled={rows.length >= MAX_ATTEMPTS}
          />
        </View>
        {rows.length > 1 && (
          <Pressable onPress={() => onChange(rows.slice(0, -1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove last ${unitNoun.toLowerCase()}`}>
            <Text style={{ fontSize: 13, color: colors.textMuted, paddingHorizontal: 8 }}>Remove last</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
