import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { useAuthStore } from '@/store/authStore';
import { detectAnomalies } from '@/engine/anomalies';
import { estimatePeakTiming } from '@/engine/peakTiming';
import { projectAtWeek } from '@/engine/projections';
import { currentWeekFromLogs } from '@/engine/load';
import { Screen } from '@/components/Screen';
import { Pill, type PillTone } from '@/components/Pill';
import { StaleBanner } from '@/components/StaleBanner';
import { repository } from '@/data/repository';
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
  const { data, loading, isStale, refresh } = useProgrammeData();
  const programmeName = useAuthStore((s) => s.session?.programmeName) ?? 'Your programme';
  const [joinCode, setJoinCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    repository.getMyProgrammeJoinCode().then(setJoinCode).catch(() => {});
  }, []);

  // Refetch on focus so the notification badge clears after visiting Notifications
  // — tabs stay mounted across navigation, so nothing else would trigger a refetch.
  // Skip the very first focus: useProgrammeData already fetches on mount, and this
  // screen is focused immediately on mount too, so without the guard we'd fire the
  // same fetch twice on cold start.
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const currentWeek = useMemo(() => currentWeekFromLogs(data.weeklyLogs), [data.weeklyLogs]);
  const currentWeekLabel = currentWeek > 0 ? `W${currentWeek}` : 'No results logged yet';

  const rows: Row[] = useMemo(() => {
    return data.athletes.map((athlete) => {
      const logs = data.weeklyLogs[athlete.id] ?? [];
      const tests = data.strengthTests[athlete.id] ?? [];
      const lastLog = logs[logs.length - 1];
      const loggedThisWeek = currentWeek > 0 && logs.some((l) => l.week === currentWeek);
      const anomalies = detectAnomalies(athlete, logs, tests, currentWeek);
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
  }, [data, colors, currentWeek]);

  const loggedCount = rows.filter((r) => r.loggedThisWeek).length;
  const missingCount = rows.length - loggedCount;
  const alertCount = rows.filter((r) => r.pillTone !== 'success').length;
  const unreadNotifications = data.notifications.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.text, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.background }}>My Squad</Text>
            <Text style={{ fontSize: 11, color: colors.background, opacity: 0.6, marginTop: 1 }}>
              {programmeName} · {currentWeekLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(coach)/notifications')}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
          >
            <View>
              <Ionicons name="notifications-outline" size={19} color={colors.background} />
              {unreadNotifications > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.danger,
                  }}
                />
              )}
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(coach)/settings')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={19} color={colors.background} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          <StatBox value={loggedCount} label="Logged" bg={colors.successBg} fg={colors.success} />
          <StatBox value={missingCount} label="Missing" bg={colors.dangerBg} fg={colors.danger} />
          <StatBox value={alertCount} label="Alerts" bg={colors.warningBg} fg={colors.warning} />
        </View>
      </View>

      {isStale && <StaleBanner />}

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
        {!loading && rows.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
            <Ionicons name="people-outline" size={32} color={colors.textFaint} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
              No athletes yet
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
              Share your programme join code with your athletes so they can sign up: {'\n'}
              <Text style={{ fontWeight: '700', color: colors.text }}>{joinCode ?? '…'}</Text>
            </Text>
          </View>
        )}
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
