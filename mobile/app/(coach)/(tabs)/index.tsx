import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { detectAnomalies } from '@/engine/anomalies';
import { estimatePeakTiming } from '@/engine/peakTiming';
import { projectAtWeek } from '@/engine/projections';
import { Screen } from '@/components/Screen';
import { Pill, type PillTone } from '@/components/Pill';
import type { Athlete } from '@/data/types';

interface Row {
  athlete: Athlete;
  dotColor: string;
  pillLabel: string;
  pillTone: PillTone;
  subtitle: string;
  loggedThisWeek: boolean;
}

export default function SquadScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, refresh } = useProgrammeData();

  const rows: Row[] = useMemo(() => {
    return data.athletes.map((athlete) => {
      const logs = data.weeklyLogs[athlete.id] ?? [];
      const tests = data.strengthTests[athlete.id] ?? [];
      const lastLog = logs[logs.length - 1];
      const loggedThisWeek = !!lastLog?.loggedAt;
      const anomalies = detectAnomalies(athlete, logs, tests);
      const peak = estimatePeakTiming(logs);
      const projection = projectAtWeek(logs, 4);

      let dotColor = colors.success;
      let pillLabel = 'On track';
      let pillTone: PillTone = 'success';

      const danger = anomalies.find((a) => a.severity === 'danger');
      const warning = anomalies.find((a) => a.severity === 'warning');

      if (!loggedThisWeek) {
        dotColor = colors.danger;
        pillLabel = 'No log';
        pillTone = 'danger';
      } else if (danger) {
        dotColor = colors.danger;
        pillLabel = 'Alert';
        pillTone = 'danger';
      } else if (warning) {
        dotColor = colors.warning;
        pillLabel = 'Flagged';
        pillTone = 'warning';
      } else if (peak.status === 'green') {
        dotColor = colors.success;
        pillLabel = 'On track';
        pillTone = 'success';
      } else if (peak.status === 'yellow') {
        dotColor = colors.warning;
        pillLabel = 'Borderline';
        pillTone = 'warning';
      } else {
        dotColor = colors.danger;
        pillLabel = 'Needs work';
        pillTone = 'danger';
      }

      const lastMark = lastLog?.mark;
      const subtitle = `${athlete.event} · ${lastMark != null ? `${lastMark}${athlete.unit}` : 'no data'}${
        projection ? ` · Proj ${projection.mark.toFixed(1)}${athlete.unit}` : ''
      }`;

      return { athlete, dotColor, pillLabel, pillTone, subtitle, loggedThisWeek };
    });
  }, [data, colors]);

  const loggedCount = rows.filter((r) => r.loggedThisWeek).length;
  const missingCount = rows.length - loggedCount;
  const alertCount = rows.filter((r) => r.pillTone !== 'success').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.text, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.background }}>My Squad</Text>
            <Text style={{ fontSize: 11, color: colors.background, opacity: 0.6, marginTop: 1 }}>Throwers R Us · Week 42</Text>
          </View>
          <Pressable onPress={() => router.push('/(coach)/notifications')} hitSlop={12} style={{ marginRight: 16 }}>
            <Ionicons name="notifications-outline" size={19} color={colors.background} />
          </Pressable>
          <Pressable onPress={() => router.push('/(coach)/settings')} hitSlop={12}>
            <Ionicons name="settings-outline" size={19} color={colors.background} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          <StatBox value={loggedCount} label="Logged" bg={colors.successBg} fg={colors.success} />
          <StatBox value={missingCount} label="Missing" bg={colors.dangerBg} fg={colors.danger} />
          <StatBox value={alertCount} label="Alerts" bg={colors.warningBg} fg={colors.warning} />
        </View>
      </View>

      <Screen onRefresh={refresh} padded={false} style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {rows.map((row, i) => (
          <MotiView
            key={row.athlete.id}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250, delay: i * 40 }}
          >
            <Pressable
              onPress={() => router.push(`/(coach)/athlete/${row.athlete.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: row.dotColor }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{row.athlete.name}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{row.subtitle}</Text>
              </View>
              <Pill label={row.pillLabel} tone={row.pillTone} />
            </Pressable>
          </MotiView>
        ))}
      </Screen>
    </View>
  );
}

function StatBox({ value, label, bg, fg }: { value: number; label: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: fg }}>{value}</Text>
      <Text style={{ fontSize: 10, color: fg }}>{label}</Text>
    </View>
  );
}
