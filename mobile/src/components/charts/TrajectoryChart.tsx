import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter, AreaRange } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ProjectedPoint, TrajectoryPoint } from '@/engine/projections';

interface Props {
  actual: TrajectoryPoint[];
  projected: ProjectedPoint[];
  standard?: number;
  unit: string;
}

const H = 170;

interface Row {
  week: number;
  actual: number | null;
  forecast: number | null;
  low: number | null;
  high: number | null;
  standardLine: number | null;
  [key: string]: unknown;
}

export function TrajectoryChart({ actual, projected, standard, unit }: Props) {
  const { colors } = useAppTheme();

  const rows: Row[] = useMemo(() => {
    if (actual.length === 0) return [];
    const last = actual[actual.length - 1];
    const out: Row[] = actual.map((a) => ({
      week: a.week,
      actual: a.mark,
      forecast: a.week === last.week ? a.mark : null,
      low: a.week === last.week ? a.mark : null,
      high: a.week === last.week ? a.mark : null,
      standardLine: standard ?? null,
    }));
    for (const p of projected) {
      out.push({ week: p.week, actual: null, forecast: p.mark, low: p.low, high: p.high, standardLine: standard ?? null });
    }
    return out;
  }, [actual, projected, standard]);

  if (actual.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  const lastActual = actual[actual.length - 1];

  return (
    <View style={{ height: H }}>
      <CartesianChart
        data={rows}
        xKey="week"
        yKeys={['actual', 'forecast', 'low', 'high', 'standardLine']}
        domainPadding={{ left: 16, right: 16, top: 24, bottom: 12 }}
      >
        {({ points }) => (
          <>
            {standard != null && (
              <Line points={points.standardLine} color={colors.danger} strokeWidth={1} opacity={0.6}>
                <DashPathEffect intervals={[4, 4]} />
              </Line>
            )}
            <AreaRange lowerPoints={points.low} upperPoints={points.high} color={colors.text} opacity={0.08} />
            <Line points={points.forecast} color={colors.text} strokeWidth={1.4} opacity={0.65} curveType="linear">
              <DashPathEffect intervals={[5, 4]} />
            </Line>
            <Line points={points.actual} color={colors.text} strokeWidth={2.2} curveType="linear" />
            <Scatter points={points.actual} radius={3} color={colors.text} />
            <Scatter points={[points.actual[points.actual.length - 1]]} radius={4.5} color={colors.text} />
          </>
        )}
      </CartesianChart>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 9, color: colors.textFaint }}>
          Now: {lastActual.mark.toFixed(1)}
          {unit}
        </Text>
        {standard != null && (
          <Text style={{ fontSize: 9, color: colors.danger }}>
            Standard: {standard.toFixed(1)}
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}
