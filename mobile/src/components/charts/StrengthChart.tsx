import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { StrengthTest } from '@/data/types';

interface Props {
  tests: StrengthTest[];
}

const H = 150;

interface Row {
  index: number;
  squat: number;
  clean: number;
  bench: number;
  [key: string]: unknown;
}

export function StrengthChart({ tests }: Props) {
  const { colors } = useAppTheme();
  const rows: Row[] = useMemo(
    () => tests.map((t, i) => ({ index: i, squat: t.squat, clean: t.clean, bench: t.bench })),
    [tests],
  );

  if (tests.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  const last = tests[tests.length - 1];

  return (
    <View>
      <View style={{ height: H }}>
        <CartesianChart data={rows} xKey="index" yKeys={['squat', 'clean', 'bench']} domainPadding={{ left: 16, right: 16, top: 20, bottom: 8 }}>
          {({ points }) => (
            <>
              <Line points={points.bench} color={colors.textFaint} strokeWidth={1.5} curveType="linear">
                <DashPathEffect intervals={[5, 3]} />
              </Line>
              <Line points={points.clean} color={colors.textMuted} strokeWidth={1.8} curveType="linear" />
              <Line points={points.squat} color={colors.text} strokeWidth={2.2} curveType="linear" />
              <Scatter points={points.bench} radius={2.5} color={colors.textFaint} />
              <Scatter points={points.clean} radius={2.5} color={colors.textMuted} />
              <Scatter points={points.squat} radius={3} color={colors.text} />
            </>
          )}
        </CartesianChart>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 9, color: colors.textFaint }}>{tests[0].label}</Text>
        <Text style={{ fontSize: 9, color: colors.text, fontWeight: '500' }}>
          {last.label} · Squat {last.squat} · Clean {last.clean} · Bench {last.bench}
        </Text>
      </View>
    </View>
  );
}
