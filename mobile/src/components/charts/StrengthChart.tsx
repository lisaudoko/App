import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { StrengthTest } from '@/data/types';
import { makeLinearScale, niceDomain } from './scale';

interface Props {
  tests: StrengthTest[];
}

const W = 300;
const H = 130;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

const LIFTS: { key: keyof StrengthTest; label: string; strokeWidth: number; dash?: string }[] = [
  { key: 'squat', label: 'Squat', strokeWidth: 2.2 },
  { key: 'clean', label: 'Clean', strokeWidth: 1.8 },
  { key: 'bench', label: 'Bench', strokeWidth: 1.5, dash: '5,3' },
];

export function StrengthChart({ tests }: Props) {
  const { colors } = useAppTheme();
  if (tests.length < 2) return null;

  const x = makeLinearScale([0, tests.length - 1], [PAD_L + 8, W - PAD_R - 8]);
  const allValues = tests.flatMap((t) => [t.squat, t.clean, t.bench]);
  const y = makeLinearScale(niceDomain(allValues), [H - PAD_B, PAD_T]);

  const lineColors = [colors.text, colors.textMuted, colors.textFaint];

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />
        <Line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={colors.border} strokeWidth={0.75} />

        {LIFTS.map((lift, i) => {
          const points = tests.map((t, idx) => `${x(idx)},${y(t[lift.key] as number)}`).join(' ');
          const last = tests[tests.length - 1];
          return (
            <React.Fragment key={lift.key}>
              <Polyline
                points={points}
                fill="none"
                stroke={lineColors[i]}
                strokeWidth={lift.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={lift.dash}
              />
              {tests.map((t, idx) => (
                <Circle key={idx} cx={x(idx)} cy={y(t[lift.key] as number)} r={idx === tests.length - 1 ? 4 : 3} fill={lineColors[i]} />
              ))}
              <SvgText x={x(tests.length - 1)} y={y(last[lift.key] as number) - 6} fontSize={8.5} fill={lineColors[i]} textAnchor="middle" fontWeight="500">
                {last[lift.key]}
              </SvgText>
            </React.Fragment>
          );
        })}

        {tests.map((t, idx) => (
          <SvgText
            key={t.label}
            x={x(idx)}
            y={H - PAD_B + 12}
            fontSize={8}
            fill={idx === tests.length - 1 ? colors.text : colors.textFaint}
            textAnchor="middle"
            fontWeight={idx === tests.length - 1 ? '500' : '400'}
          >
            {t.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
