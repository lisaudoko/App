import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { DashPathEffect } from '@shopify/react-native-skia';
import { useAppTheme } from '@/theme/ThemeProvider';
import { linearRegression, projectNextValue } from '@/engine/stats';

interface Props {
  xs: number[];
  ys: number[];
  r: number;
  xLabel: string;
}

const H = 150;

interface Row {
  x: number;
  y: number | null;
  fit: number | null;
  fitProj: number | null;
  [key: string]: unknown;
}

export function CorrelationChart({ xs, ys, r, xLabel }: Props) {
  const { colors } = useAppTheme();

  const { rows, strength, strengthColor, projectedX, projectedY } = useMemo(() => {
    const { slope, intercept } = linearRegression(xs, ys);
    // Where the fit line would land at next test's projected strength — ties
    // the strength projection to what it would mean for this athlete's mark.
    const projX = Math.round(projectNextValue(xs));
    const projY = slope * projX + intercept;

    const rowsOut: Row[] = xs.map((x, i) => ({ x, y: ys[i], fit: slope * x + intercept, fitProj: null }));
    // The last real point doubles as the start of the dashed projected segment.
    const last = rowsOut[rowsOut.length - 1];
    if (last) last.fitProj = last.fit;
    rowsOut.push({ x: projX, y: null, fit: null, fitProj: projY });

    const s = Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak';
    const sc = Math.abs(r) >= 0.7 ? colors.success : Math.abs(r) >= 0.4 ? colors.warning : colors.danger;
    return { rows: rowsOut, strength: s, strengthColor: sc, projectedX: projX, projectedY: projY };
  }, [xs, ys, r, colors]);

  if (xs.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={{ height: H }}>
        <CartesianChart data={rows} xKey="x" yKeys={['y', 'fit', 'fitProj']} domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}>
          {({ points }) => (
            <>
              <Line points={points.fit} color={colors.text} strokeWidth={1.2} opacity={0.3} curveType="linear" />
              <Line points={points.fitProj} color={colors.accent} strokeWidth={1.4} opacity={0.6} curveType="linear">
                <DashPathEffect intervals={[4, 4]} />
              </Line>
              <Scatter points={points.y} radius={4.5} color={colors.text} opacity={0.85} />
              <Scatter points={[points.fitProj[points.fitProj.length - 1]]} radius={4} color={colors.accent} shape="circle" />
            </>
          )}
        </CartesianChart>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{xLabel}</Text>
        <Text style={{ fontSize: 12, color: strengthColor, fontWeight: '500' }}>
          r = {r.toFixed(2)} · {strength}
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.accent, marginTop: 2 }}>
        Projected next test · {xLabel} ~{projectedX} → ~{projectedY.toFixed(2)}
      </Text>
    </View>
  );
}
