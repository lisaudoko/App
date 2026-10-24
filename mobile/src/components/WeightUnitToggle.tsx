import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useUnitsStore } from '@/store/unitsStore';
import { Card } from '@/components/Card';

/** Per-device lbs/kg switch. Weights stay stored in lbs; this only changes what's shown and typed. */
export function WeightUnitToggle({ hint = 'Used for lifts, maxes and body weight on this device.' }: { hint?: string }) {
  const { colors } = useAppTheme();
  const weightUnit = useUnitsStore((s) => s.weightUnit);
  const setWeightUnit = useUnitsStore((s) => s.setWeightUnit);

  return (
    <Card>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>{hint}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['lbs', 'kg'] as const).map((u) => {
          const active = weightUnit === u;
          return (
            <Pressable
              key={u}
              onPress={() => setWeightUnit(u)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={u === 'kg' ? 'Kilograms' : 'Pounds'}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: active ? colors.accent : 'transparent',
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                {u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
