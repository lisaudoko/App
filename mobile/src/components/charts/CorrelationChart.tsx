import React from 'react';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeProvider';
import { linearRegression } from '@/engine/stats';
import { makeLinearScale, niceDomain } from './scale';

interface Props {
  xs: number[];
  ys: number[];
  r: number;
  xLabel: string;
}

const W = 300;
const H = 130;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 28;

export function CorrelationChart({ xs, ys, r, xLabel }: Props) {
  const { colors } = useAppTheme();
  if (xs.length < 2) return null;

  const x = makeLinearScale(niceDomain(xs), [PAD_L, W - PAD_R]);
  const y = makeLinearScale(niceDomain(ys), [H - PAD_B, PAD_T]);
  const { slope, intercept } = linearRegression(xs, ys);

  const xDomain = niceDomain(xs);
  const lineY1 = slope * xDomain[0] + intercept;
  const lineY2 = slope * xDomain[1] + intercept;

  const strength = Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak';
  const strengthColor = Math.abs(r) >= 0.7 ? colors.success : Math.abs(r) >= 0.4 ? colors.warning : colors.danger;

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />
      <Line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />
      <Line x1={x(xDomain[0])} y1={y(lineY1)} x2={x(xDomain[1])} y2={y(lineY2)} stroke={colors.text} strokeWidth={1.2} opacity={0.25} />

      {xs.map((xv, i) => (
        <Circle
          key={i}
          cx={x(xv)}
          cy={y(ys[i])}
          r={i === xs.length - 1 ? 5.5 : 4.5}
          fill={colors.text}
          opacity={i === xs.length - 1 ? 1 : 0.8}
        />
      ))}

      <SvgText x={(PAD_L + W - PAD_R) / 2} y={H - 6} fontSize={8} fill={colors.textMuted} textAnchor="middle">
        {xLabel}
      </SvgText>
      <SvgText x={W - PAD_R} y={PAD_T + 12} fontSize={10} fill={strengthColor} textAnchor="end" fontWeight="500">
        r = {r.toFixed(2)}
      </SvgText>
      <SvgText x={W - PAD_R} y={PAD_T + 24} fontSize={8.5} fill={colors.textMuted} textAnchor="end">
        {strength} correlation
      </SvgText>
    </Svg>
  );
}
