import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
import { TrialBanner } from '@/components/TrialBanner';
import { BroadcastSheet } from '@/components/BroadcastSheet';
import { useCoachAccess } from '@/hooks/useCoachAccess';
import { repository } from '@/data/repository';
import type { Athlete } from '@/data/types';
import { EVENT_GROUP_DIRECTION, EVENT_GROUP_LABEL, formatPerformance, type EventGroup } from '@/lib/formatPerformance';

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
  const { access } = useCoachAccess();
  const programmeName = useAuthStore((s) => s.session?.programmeName) ?? 'Your programme';
  const [joinCode, setJoinCode] = React.useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeEventGroup, setActiveEventGroup] = useState<EventGroup | null>(null);
  const [broadcastVisible, setBroadcastVisible] = useState(false);

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
      const direction = EVENT_GROUP_DIRECTION[athlete.eventGroup ?? 'throws'];
      const peak = estimatePeakTiming(logs, direction);
      const projection = projectAtWeek(logs, 4, direction);

      let dotColor = colors.success;
      let pillLabel = 'On track';
      let pillTone: PillTone = 'success';

      const danger = anomalies.find((a) => a.severity === 'danger');
      const warning = anomalies.find((a) => a.severity === 'warning');

      if (!loggedThisWeek) {
        dotColor = colors.statusColors.noLog.text;
        pillLabel = 'No log';
        pillTone = 'neutral';
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

      const perfUnit = athlete.unit === 's' ? 'seconds' : 'metres';
      const lastMark = lastLog?.mark;
      const subtitle = `${athlete.event} · ${lastMark != null ? formatPerformance(lastMark, perfUnit) : 'no data'}${
        projection ? ` · Proj ${formatPerformance(projection.mark, perfUnit)}` : ''
      }`;

      return { athlete, dotColor, pillLabel, pillTone, subtitle, loggedThisWeek };
    });
  }, [data, colors, currentWeek]);

  const eventGroups = useMemo(() => {
    const set = new Set(data.athletes.map((a) => a.eventGroup).filter((g): g is EventGroup => !!g));
    return Array.from(set).sort();
  }, [data.athletes]);

  const eventGroupFilteredRows = useMemo(
    () => (activeEventGroup ? rows.filter((r) => r.athlete.eventGroup === activeEventGroup) : rows),
    [rows, activeEventGroup],
  );

  const groups = useMemo(() => {
    const set = new Set(eventGroupFilteredRows.map((r) => r.athlete.group).filter((g): g is string => !!g));
    return Array.from(set).sort();
  }, [eventGroupFilteredRows]);

  const visibleRows = useMemo(
    () => (activeGroup ? eventGroupFilteredRows.filter((r) => r.athlete.group === activeGroup) : eventGroupFilteredRows),
    [eventGroupFilteredRows, activeGroup],
  );

  const loggedCount = rows.filter((r) => r.loggedThisWeek).length;
  const missingCount = rows.length - loggedCount;
  const alertCount = rows.filter((r) => r.pillTone !== 'success').length;
  const unreadNotifications = data.notifications.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navBar, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.navText }}>My Squad</Text>
            <Text style={{ fontSize: 13, color: colors.navText, opacity: 0.6, marginTop: 1 }}>
              {programmeName} · {currentWeekLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(coach)/workouts')}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Workout plans"
          >
            <Ionicons name="barbell-outline" size={19} color={colors.navText} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(coach)/add-athlete')}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Add athlete"
          >
            <Ionicons name="person-add-outline" size={19} color={colors.navText} />
          </Pressable>
          <Pressable
            onPress={() => setBroadcastVisible(true)}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Broadcast to squad"
          >
            <Ionicons name="megaphone-outline" size={19} color={colors.navText} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(coach)/notifications')}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
          >
            <View>
              <Ionicons name="notifications-outline" size={19} color={colors.navText} />
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
            <Ionicons name="settings-outline" size={19} color={colors.navText} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          <StatBox value={loggedCount} label="Logged" bg={colors.successBg} fg={colors.success} />
          <StatBox value={missingCount} label="Missing" bg={colors.dangerBg} fg={colors.danger} />
          <StatBox value={alertCount} label="Alerts" bg={colors.warningBg} fg={colors.warning} />
        </View>
      </View>

      {access.isTrialing && <TrialBanner daysLeft={access.daysLeft} />}
      {isStale && <StaleBanner />}

      {eventGroups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            {[null, ...eventGroups].map((g) => {
              const active = activeEventGroup === g;
              return (
                <Pressable
                  key={g ?? 'all-events'}
                  onPress={() => {
                    setActiveEventGroup(g);
                    setActiveGroup(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={g ? EVENT_GROUP_LABEL[g] : 'All events'}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: active ? colors.text : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? colors.text : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.background : colors.textMuted }}>
                    {g ? EVENT_GROUP_LABEL[g] : 'All events'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            {[null, ...groups].map((g) => {
              const active = activeGroup === g;
              return (
                <Pressable
                  key={g ?? 'all'}
                  onPress={() => setActiveGroup(g)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={g ?? 'All'}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: active ? colors.accentText : colors.textMuted }}>{g ?? 'All'}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Screen onRefresh={refresh} padded={false} style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {visibleRows.map((row, i) => (
          <MotiView
            key={row.athlete.id}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250, delay: i * 40 }}
          >
            <Pressable
              onPress={() => router.push(`/(coach)/athlete/${row.athlete.id}`)}
              style={({ pressed }) => [{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 52,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: row.dotColor }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: '500', color: colors.text }}>{row.athlete.name}</Text>
                  {!!row.athlete.group && (
                    <Text style={{ fontSize: 11, color: colors.textFaint, backgroundColor: colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                      {row.athlete.group}
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{row.subtitle}</Text>
              </View>
              <Pill label={row.pillLabel} tone={row.pillTone} />
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </MotiView>
        ))}
        {!loading && rows.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
            <Ionicons name="people-outline" size={32} color={colors.textFaint} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
              No athletes yet
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
              Add them yourself from the + above, or share your programme join code so they can sign up: {'\n'}
              <Text style={{ fontWeight: '700', color: colors.text }}>{joinCode ?? '…'}</Text>
            </Text>
          </View>
        )}
        {!loading && rows.length > 0 && visibleRows.length === 0 && (
          <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
            No athletes in &quot;{activeGroup}&quot;.
          </Text>
        )}
      </Screen>

      <BroadcastSheet visible={broadcastVisible} onClose={() => setBroadcastVisible(false)} athletes={data.athletes} />
    </View>
  );
}

function StatBox({ value, label, bg, fg }: { value: number; label: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
      <Text style={{ fontSize: 21, fontWeight: '600', color: fg }}>{value}</Text>
      <Text style={{ fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}
