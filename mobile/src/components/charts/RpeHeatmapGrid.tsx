import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { WeekLoadInfo } from '@/engine/load';

interface Row {
  athleteId: string;
  name: string;
  cells: WeekLoadInfo[];
}

export function RpeHeatmapGrid({ rows }: { rows: Row[] }) {
  const { colors } = useAppTheme();

  function cellColors(status: WeekLoadInfo['status']) {
    switch (status) {
      case 'high':
        return { bg: colors.dangerBg, fg: colors.danger };
      case 'low':
        return { bg: colors.successBg, fg: colors.success };
      case 'ok':
        return { bg: colors.warningBg, fg: colors.warning };
      default:
        return { bg: colors.border, fg: colors.textFaint };
    }
  }

  const weekLabels = rows[0]?.cells.map((c) => c.label) ?? [];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <View style={{ width: 84 }} />
          {weekLabels.map((label) => (
            <Text key={label} style={{ width: 34, fontSize: 10, color: colors.textFaint, textAlign: 'center' }}>
              {label}
            </Text>
          ))}
        </View>
        {rows.map((row) => (
          <View key={row.athleteId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text numberOfLines={1} style={{ width: 84, fontSize: 11, color: colors.text }}>
              {row.name}
            </Text>
            {row.cells.map((cell) => {
              const { bg, fg } = cellColors(cell.status);
              return (
                <View
                  key={cell.week}
                  style={{
                    width: 30,
                    height: 26,
                    marginHorizontal: 2,
                    borderRadius: 4,
                    backgroundColor: bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '500', color: fg }}>{cell.rpe ?? ''}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
