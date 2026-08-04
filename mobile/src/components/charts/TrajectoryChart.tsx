import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter, AreaRange } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ProjectedPoint, TrajectoryPoint } from '@/engine/projections';
import { formatPerformance, type PerformanceUnit } from '@/lib/formatPerformance';

export interface MeetTrajectoryPoint {
  week: number;
  mark: number;
  meetName: string;
  date: string;
}

interface Props {
  actual: TrajectoryPoint[];
  projected: ProjectedPoint[];
  standard?: number;
  unit: PerformanceUnit;
  meetPoints?: MeetTrajectoryPoint[];
}

const H = 170;

interface Row {
  week: number;
  actual: number | null;
  forecast: number | null;
  low: number | null;
  high: number | null;
  standardLine: number | null;
  meetMark: number | null;
  [key: string]: unknown;
}

export function TrajectoryChart({ actual, projected, standard, unit, meetPoints = [] }: Props) {
  const { colors } = useAppTheme();

  const rows: Row[] = useMemo(() => {
    if (actual.length === 0) return [];
    const last = actual[actual.length - 1];
    const meetByWeek = new Map(meetPoints.map((m) => [m.week, m.mark]));
    const weeks = new Set([...actual.map((a) => a.week), ...meetPoints.map((m) => m.week)]);
    const out: Row[] = actual.map((a) => ({
      week: a.week,
      actual: a.mark,
      forecast: a.week === last.week ? a.mark : null,
      low: a.week === last.week ? a.mark : null,
      high: a.week === last.week ? a.mark : null,
      standardLine: standard ?? null,
      meetMark: meetByWeek.get(a.week) ?? null,
    }));
    for (const p of projected) {
      out.push({ week: p.week, actual: null, forecast: p.mark, low: p.low, high: p.high, standardLine: standard ?? null, meetMark: meetByWeek.get(p.week) ?? null });
    }
    // Meet weeks with no training log that week still need a row so the point renders.
    for (const w of weeks) {
      if (!out.some((r) => r.week === w)) {
        out.push({ week: w, actual: null, forecast: null, low: null, high: null, standardLine: standard ?? null, meetMark: meetByWeek.get(w) ?? null });
      }
    }
    return out.sort((a, b) => a.week - b.week);
  }, [actual, projected, standard, meetPoints]);

  if (actual.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  const lastActual = actual[actual.length - 1];

  return (
    <View style={{ height: H }}>
      <CartesianChart
        data={rows}
        xKey="week"
        yKeys={['actual', 'forecast', 'low', 'high', 'standardLine', 'meetMark']}
        domainPadding={{ left: 16, right: 16, top: 24, bottom: 12 }}
      >
        {({ points }) => (
          <>
            {standard != null && (
              <Line points={points.standardLine} color={colors.danger} strokeWidth={1} opacity={0.6}>
                <DashPathEffect intervals={[4, 4]} />
              </Line>
            )}
            <AreaRange lowerPoints={points.low} upperPoints={points.high} color={colors.textFaint} opacity={0.15} />
            <Line points={points.forecast} color={colors.accent} strokeWidth={1.4} opacity={0.65} curveType="linear">
              <DashPathEffect intervals={[5, 4]} />
            </Line>
            <Line points={points.actual} color={colors.accent} strokeWidth={2.2} curveType="linear" />
            <Scatter points={points.actual} radius={3} color={colors.accent} shape="circle" />
            <Scatter points={[points.actual[points.actual.length - 1]]} radius={4.5} color={colors.accent} shape="circle" />
            {/* Meet results get a distinct marker shape (Victory Native only offers circle/square/star — no diamond) and amber, since teal/red are already taken by the performance line and standard line. */}
            <Scatter points={points.meetMark} radius={5} color={colors.warning} shape="square" />
          </>
        )}
      </CartesianChart>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>Now: {formatPerformance(lastActual.mark, unit)}</Text>
        {standard != null && (
          <Text style={{ fontSize: 11, color: colors.danger }}>Standard: {formatPerformance(standard, unit)}</Text>
        )}
      </View>
      {meetPoints.length > 0 && (
        <View style={{ marginTop: 6 }}>
          {meetPoints.map((m) => (
            <Text key={`${m.week}-${m.meetName}`} style={{ fontSize: 10, color: colors.warning }}>
              ■ {m.meetName} ({m.date}): {formatPerformance(m.mark, unit)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
