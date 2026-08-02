import React from 'react';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { WeeklyLog } from '@/data/types';
import { makeLinearScale, niceDomain } from './scale';

interface Props {
  logs: WeeklyLog[];
}

const W = 300;
const H = 130;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;
const RPE_THRESHOLD = 8;

export function LoadRpeChart({ logs }: Props) {
  const { colors } = useAppTheme();
  const logged = logs.filter((l) => l.rpe != null && l.volumeLoad != null);

  if (logged.length === 0) {
    return null;
  }

  const x = makeLinearScale(
    [logged[0].week, logged[logged.length - 1].week],
    [PAD_L + 12, W - PAD_R - 12],
  );
  const yLoad = makeLinearScale(niceDomain(logged.map((l) => l.volumeLoad as number), 0.15), [H - PAD_B, PAD_T]);
  const yRpe = makeLinearScale([0, 10], [H - PAD_B, PAD_T]);

  const barWidth = Math.max(12, (W - PAD_L - PAD_R) / logged.length - 14);
  const rpePoints = logged.map((l) => `${x(l.week)},${yRpe(l.rpe as number)}`).join(' ');

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />
      <Line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />
      <Line
        x1={PAD_L}
        y1={yRpe(RPE_THRESHOLD)}
        x2={W - PAD_R}
        y2={yRpe(RPE_THRESHOLD)}
        stroke={colors.danger}
        strokeWidth={0.7}
        strokeDasharray="3,3"
        opacity={0.5}
      />
      <SvgText x={W - PAD_R + 2} y={yRpe(RPE_THRESHOLD) + 3} fontSize={7} fill={colors.danger}>
        8
      </SvgText>

      {logged.map((l) => (
        <Rect
          key={l.week}
          x={x(l.week) - barWidth / 2}
          y={yLoad(l.volumeLoad as number)}
          width={barWidth}
          height={H - PAD_B - yLoad(l.volumeLoad as number)}
          rx={2}
          fill={colors.text}
          opacity={0.18}
        />
      ))}

      <Polyline points={rpePoints} fill="none" stroke={colors.warning} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {logged.map((l) => (
        <Circle key={l.week} cx={x(l.week)} cy={yRpe(l.rpe as number)} r={2.5} fill={colors.warning} />
      ))}

      <SvgText x={x(logged[0].week)} y={H - PAD_B + 12} fontSize={7.5} fill={colors.textFaint} textAnchor="middle">
        {logged[0].label}
      </SvgText>
      <SvgText
        x={x(logged[logged.length - 1].week)}
        y={H - PAD_B + 12}
        fontSize={7.5}
        fill={colors.text}
        textAnchor="middle"
        fontWeight="500"
      >
        {logged[logged.length - 1].label}
      </SvgText>
    </Svg>
  );
}
