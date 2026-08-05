import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Bar, Line, Scatter } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import { projectNextValue } from '@/engine/stats';
import type { WeeklyLog } from '@/data/types';

interface Props {
  logs: WeeklyLog[];
}

const H = 150;
const RPE_THRESHOLD = 8;
/** Trend is computed over just the recent window so a stale early-season spike doesn't skew next-week's projection. */
const TREND_WINDOW = 6;

interface Row {
  week: number;
  volumeLoad: number | null;
  rpe: number | null;
  rpeProj: number | null;
  rpeThreshold: number;
  [key: string]: unknown;
}

export function LoadRpeChart({ logs }: Props) {
  const { colors } = useAppTheme();
  const logged = logs.filter((l) => l.rpe != null && l.volumeLoad != null);

  const projectedRpe = useMemo(() => {
    const recent = logged.slice(-TREND_WINDOW).map((l) => l.rpe as number);
    return Math.min(10, projectNextValue(recent));
  }, [logged]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = logged.map((l, i) => ({
      week: l.week,
      volumeLoad: l.volumeLoad,
      rpe: l.rpe,
      // The last real point doubles as the start of the dashed projected segment.
      rpeProj: i === logged.length - 1 ? l.rpe : null,
      rpeThreshold: RPE_THRESHOLD,
    }));
    const lastWeek = logged.length ? logged[logged.length - 1].week : 0;
    out.push({ week: lastWeek + 1, volumeLoad: null, rpe: null, rpeProj: projectedRpe, rpeThreshold: RPE_THRESHOLD });
    return out;
  }, [logged, projectedRpe]);
  const maxLoad = useMemo(() => Math.max(1, ...logged.map((l) => l.volumeLoad as number)), [logged]);

  if (logged.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  return (
    <View style={{ height: H }}>
      <CartesianChart
        data={rows}
        xKey="week"
        yKeys={['volumeLoad', 'rpe', 'rpeProj', 'rpeThreshold']}
        yAxis={[
          { yKeys: ['volumeLoad'], domain: [0, maxLoad * 1.2] },
          { yKeys: ['rpe', 'rpeProj', 'rpeThreshold'], domain: [0, 10] },
        ]}
        domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}
      >
        {({ points, chartBounds }) => (
          <>
            <Bar points={points.volumeLoad} chartBounds={chartBounds} color={colors.text} opacity={0.16} roundedCorners={{ topLeft: 3, topRight: 3 }} />
            <Line points={points.rpeThreshold} color={colors.danger} strokeWidth={1} opacity={0.5}>
              <DashPathEffect intervals={[3, 3]} />
            </Line>
            <Line points={points.rpeProj} color={colors.warning} strokeWidth={1.6} opacity={0.55} curveType="linear">
              <DashPathEffect intervals={[4, 4]} />
            </Line>
            <Line points={points.rpe} color={colors.warning} strokeWidth={1.8} curveType="linear" />
            <Scatter points={points.rpe} radius={2.5} color={colors.warning} />
            <Scatter points={[points.rpeProj[points.rpeProj.length - 1]]} radius={3.5} color={colors.warning} shape="circle" />
          </>
        )}
      </CartesianChart>
      <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>Grey bars = training load · Amber line = RPE · Red dashed = RPE 8</Text>
      <Text style={{ fontSize: 11, color: colors.warning, marginTop: 2 }}>Projected next week&apos;s RPE · {projectedRpe.toFixed(1)}</Text>
    </View>
  );
}
