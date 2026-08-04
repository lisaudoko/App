import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { linearRegression } from '@/engine/stats';

interface Props {
  xs: number[];
  ys: number[];
  r: number;
  xLabel: string;
}

const H = 150;

interface Row {
  x: number;
  y: number;
  fit: number;
  [key: string]: unknown;
}

export function CorrelationChart({ xs, ys, r, xLabel }: Props) {
  const { colors } = useAppTheme();

  const { rows, strength, strengthColor } = useMemo(() => {
    const { slope, intercept } = linearRegression(xs, ys);
    const rowsOut: Row[] = xs.map((x, i) => ({ x, y: ys[i], fit: slope * x + intercept }));
    const s = Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak';
    const sc = Math.abs(r) >= 0.7 ? colors.success : Math.abs(r) >= 0.4 ? colors.warning : colors.danger;
    return { rows: rowsOut, strength: s, strengthColor: sc };
  }, [xs, ys, r, colors]);

  if (xs.length < 3) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>Not enough data yet</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={{ height: H }}>
        <CartesianChart data={rows} xKey="x" yKeys={['y', 'fit']} domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}>
          {({ points }) => (
            <>
              <Line points={points.fit} color={colors.text} strokeWidth={1.2} opacity={0.3} curveType="linear" />
              <Scatter points={points.y} radius={4.5} color={colors.text} opacity={0.85} />
            </>
          )}
        </CartesianChart>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 9, color: colors.textMuted }}>{xLabel}</Text>
        <Text style={{ fontSize: 10, color: strengthColor, fontWeight: '500' }}>
          r = {r.toFixed(2)} · {strength}
        </Text>
      </View>
    </View>
  );
}
