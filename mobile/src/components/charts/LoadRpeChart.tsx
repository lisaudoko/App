import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Bar, Line, Scatter } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { WeeklyLog } from '@/data/types';

interface Props {
  logs: WeeklyLog[];
}

const H = 150;
const RPE_THRESHOLD = 8;

interface Row {
  week: number;
  volumeLoad: number | null;
  rpe: number | null;
  rpeThreshold: number;
  [key: string]: unknown;
}

export function LoadRpeChart({ logs }: Props) {
  const { colors } = useAppTheme();
  const logged = logs.filter((l) => l.rpe != null && l.volumeLoad != null);

  const rows: Row[] = useMemo(
    () => logged.map((l) => ({ week: l.week, volumeLoad: l.volumeLoad, rpe: l.rpe, rpeThreshold: RPE_THRESHOLD })),
    [logged],
  );
  const maxLoad = useMemo(() => Math.max(1, ...logged.map((l) => l.volumeLoad as number)), [logged]);

  if (logged.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  return (
    <View style={{ height: H }}>
      <CartesianChart
        data={rows}
        xKey="week"
        yKeys={['volumeLoad', 'rpe', 'rpeThreshold']}
        yAxis={[
          { yKeys: ['volumeLoad'], domain: [0, maxLoad * 1.2] },
          { yKeys: ['rpe', 'rpeThreshold'], domain: [0, 10] },
        ]}
        domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}
      >
        {({ points, chartBounds }) => (
          <>
            <Bar points={points.volumeLoad} chartBounds={chartBounds} color={colors.text} opacity={0.16} roundedCorners={{ topLeft: 3, topRight: 3 }} />
            <Line points={points.rpeThreshold} color={colors.danger} strokeWidth={1} opacity={0.5}>
              <DashPathEffect intervals={[3, 3]} />
            </Line>
            <Line points={points.rpe} color={colors.warning} strokeWidth={1.8} curveType="linear" />
            <Scatter points={points.rpe} radius={2.5} color={colors.warning} />
          </>
        )}
      </CartesianChart>
      <Text style={{ fontSize: 9, color: colors.textFaint, marginTop: 2 }}>Grey bars = training load · Amber line = RPE · Red dashed = RPE 8</Text>
    </View>
  );
}
