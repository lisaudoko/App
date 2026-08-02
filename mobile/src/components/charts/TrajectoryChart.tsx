import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ProjectedPoint, TrajectoryPoint } from '@/engine/projections';
import { makeLinearScale, niceDomain } from './scale';

interface Props {
  actual: TrajectoryPoint[];
  projected: ProjectedPoint[];
  standard?: number;
  unit: string;
}

const W = 300;
const H = 150;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

export function TrajectoryChart({ actual, projected, standard, unit }: Props) {
  const { colors } = useAppTheme();

  if (actual.length < 2) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <SvgText fill={colors.textFaint} fontSize={11}>
          Log a few more weeks to see a trend
        </SvgText>
      </View>
    );
  }

  const allWeeks = [...actual.map((a) => a.week), ...projected.map((p) => p.week)];
  const allMarks = [
    ...actual.map((a) => a.mark),
    ...projected.map((p) => p.mark),
    ...projected.map((p) => p.low),
    ...projected.map((p) => p.high),
    ...(standard ? [standard] : []),
  ];

  const xDomain: [number, number] = [Math.min(...allWeeks), Math.max(...allWeeks)];
  const yDomain = niceDomain(allMarks);

  const x = makeLinearScale(xDomain, [PAD_L, W - PAD_R]);
  const y = makeLinearScale(yDomain, [H - PAD_B, PAD_T]);

  const actualPoints = actual.map((a) => `${x(a.week)},${y(a.mark)}`).join(' ');
  const lastActual = actual[actual.length - 1];
  const projectedLine = [lastActual, ...projected].map((p) => `${x(p.week)},${y(p.mark)}`).join(' ');
  const bandPoints = projected.length
    ? [
        `${x(lastActual.week)},${y(lastActual.mark)}`,
        ...projected.map((p) => `${x(p.week)},${y(p.high)}`),
        ...[...projected].reverse().map((p) => `${x(p.week)},${y(p.low)}`),
      ].join(' ')
    : '';

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />
      <Line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />

      {standard != null && (
        <>
          <Line
            x1={PAD_L}
            y1={y(standard)}
            x2={W - PAD_R}
            y2={y(standard)}
            stroke={colors.danger}
            strokeWidth={0.8}
            strokeDasharray="3,3"
            opacity={0.6}
          />
          <SvgText x={W - PAD_R} y={y(standard) - 3} fontSize={8} fill={colors.danger} textAnchor="end">
            {standard.toFixed(1)}
            {unit}
          </SvgText>
        </>
      )}

      {bandPoints.length > 0 && <Polygon points={bandPoints} fill={colors.text} opacity={0.08} />}

      {projected.length > 0 && (
        <Polyline
          points={projectedLine}
          fill="none"
          stroke={colors.text}
          strokeWidth={1.4}
          strokeDasharray="5,4"
          opacity={0.65}
        />
      )}

      <Polyline
        points={actualPoints}
        fill="none"
        stroke={colors.text}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {actual.slice(0, -1).map((a) => (
        <Circle key={a.week} cx={x(a.week)} cy={y(a.mark)} r={3} fill={colors.surface} stroke={colors.text} strokeWidth={1.8} />
      ))}
      <Circle cx={x(lastActual.week)} cy={y(lastActual.mark)} r={4.5} fill={colors.text} />
      <SvgText x={x(lastActual.week)} y={y(lastActual.mark) - 9} fontSize={9} fill={colors.text} textAnchor="middle" fontWeight="500">
        {lastActual.mark.toFixed(1)}
        {unit}
      </SvgText>
      <SvgText x={x(lastActual.week)} y={H - PAD_B + 12} fontSize={8} fill={colors.text} textAnchor="middle" fontWeight="500">
        NOW
      </SvgText>
    </Svg>
  );
}
