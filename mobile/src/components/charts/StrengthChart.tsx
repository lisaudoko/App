import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import { projectNextValue } from '@/engine/stats';
import type { StrengthTest } from '@/data/types';

interface Props {
  tests: StrengthTest[];
  /** Jumps programmes track RDL instead of bench as the third lift — the app has no separate rdl column, so this reuses the deadlift field. */
  thirdLift?: 'bench' | 'deadlift';
}

const H = 150;

interface Row {
  index: number;
  squat: number | null;
  clean: number | null;
  third: number | null;
  squatProj: number | null;
  cleanProj: number | null;
  thirdProj: number | null;
  [key: string]: unknown;
}

export function StrengthChart({ tests, thirdLift = 'bench' }: Props) {
  const { colors } = useAppTheme();

  const projected = useMemo(
    () => ({
      squat: Math.round(projectNextValue(tests.map((t) => t.squat))),
      clean: Math.round(projectNextValue(tests.map((t) => t.clean))),
      third: Math.round(projectNextValue(tests.map((t) => t[thirdLift]))),
    }),
    [tests, thirdLift],
  );

  const rows: Row[] = useMemo(() => {
    const out: Row[] = tests.map((t, i) => ({
      index: i,
      squat: t.squat,
      clean: t.clean,
      third: t[thirdLift],
      // The last actual point doubles as the start of the projected segment, so the dashed
      // line picks up exactly where the solid one ends instead of jumping from empty space.
      squatProj: i === tests.length - 1 ? t.squat : null,
      cleanProj: i === tests.length - 1 ? t.clean : null,
      thirdProj: i === tests.length - 1 ? t[thirdLift] : null,
    }));
    out.push({
      index: tests.length,
      squat: null,
      clean: null,
      third: null,
      squatProj: projected.squat,
      cleanProj: projected.clean,
      thirdProj: projected.third,
    });
    return out;
  }, [tests, thirdLift, projected]);

  if (tests.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  const last = tests[tests.length - 1];
  const thirdLabel = thirdLift === 'deadlift' ? 'Deadlift' : 'Bench';

  return (
    <View>
      <View style={{ height: H }}>
        <CartesianChart
          data={rows}
          xKey="index"
          yKeys={['squat', 'clean', 'third', 'squatProj', 'cleanProj', 'thirdProj']}
          domainPadding={{ left: 16, right: 16, top: 20, bottom: 8 }}
        >
          {({ points }) => (
            <>
              <Line points={points.thirdProj} color={colors.textFaint} strokeWidth={1.5} opacity={0.55} curveType="linear">
                <DashPathEffect intervals={[4, 4]} />
              </Line>
              <Line points={points.cleanProj} color={colors.textMuted} strokeWidth={1.6} opacity={0.55} curveType="linear">
                <DashPathEffect intervals={[4, 4]} />
              </Line>
              <Line points={points.squatProj} color={colors.accent} strokeWidth={2} opacity={0.7} curveType="linear">
                <DashPathEffect intervals={[4, 4]} />
              </Line>

              <Line points={points.third} color={colors.textFaint} strokeWidth={1.5} curveType="linear">
                <DashPathEffect intervals={[5, 3]} />
              </Line>
              <Line points={points.clean} color={colors.textMuted} strokeWidth={1.8} curveType="linear" />
              <Line points={points.squat} color={colors.text} strokeWidth={2.2} curveType="linear" />
              <Scatter points={points.third} radius={2.5} color={colors.textFaint} />
              <Scatter points={points.clean} radius={2.5} color={colors.textMuted} />
              <Scatter points={points.squat} radius={3} color={colors.text} />
              <Scatter points={[points.squatProj[points.squatProj.length - 1]]} radius={3.5} color={colors.accent} shape="circle" />
            </>
          )}
        </CartesianChart>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>{tests[0].label}</Text>
        <Text style={{ fontSize: 11, color: colors.text, fontWeight: '500' }}>
          {last.label} · Squat {last.squat} · Clean {last.clean} · {thirdLabel} {last[thirdLift]}
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.accent, marginTop: 2 }}>
        Projected next test · Squat {projected.squat} · Clean {projected.clean} · {thirdLabel} {projected.third}
      </Text>
    </View>
  );
}
