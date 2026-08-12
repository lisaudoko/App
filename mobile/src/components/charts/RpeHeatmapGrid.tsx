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
    const sc = colors.statusColors;
    switch (status) {
      case 'high':
        return { bg: sc.alert.bg, fg: sc.alert.text };
      case 'low':
        return { bg: sc.onTrack.bg, fg: sc.onTrack.text };
      case 'ok':
        return { bg: sc.borderline.bg, fg: sc.borderline.text };
      default:
        return { bg: sc.noLog.bg, fg: sc.noLog.text };
    }
  }

  const weekLabels = rows[0]?.cells.map((c) => c.label) ?? [];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ flexGrow: 0 }}>
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <View style={{ width: 84 }} />
          {weekLabels.map((label) => (
            <Text key={label} style={{ width: 34, fontSize: 12, color: colors.textFaint, textAlign: 'center' }}>
              {label}
            </Text>
          ))}
        </View>
        {rows.map((row) => (
          <View key={row.athleteId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text numberOfLines={1} style={{ width: 84, fontSize: 13, color: colors.text }}>
              {row.name}
            </Text>
            {row.cells.map((cell) => {
              const { bg, fg } = cellColors(cell.status);
              const statusWord = cell.status === 'high' ? 'high load' : cell.status === 'low' ? 'low load' : cell.status === 'ok' ? 'moderate load' : 'no data';
              return (
                <View
                  key={cell.week}
                  accessible
                  accessibilityLabel={`${row.name}, ${cell.label}: ${cell.rpe != null ? `RPE ${cell.rpe}` : 'no log'}, ${statusWord}`}
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
                  <Text style={{ fontSize: 12, fontWeight: '500', color: fg }}>{cell.rpe ?? ''}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
