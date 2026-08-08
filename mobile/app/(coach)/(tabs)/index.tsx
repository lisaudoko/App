import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { useAuthStore } from '@/store/authStore';
import { detectAnomalies } from '@/engine/anomalies';
import { estimatePeakTiming } from '@/engine/peakTiming';
import { projectAtWeek } from '@/engine/projections';
import { currentWeekFromLogs, buildRpeRow } from '@/engine/load';
import { Screen } from '@/components/Screen';
import { Pill, type PillTone } from '@/components/Pill';
import { StaleBanner } from '@/components/StaleBanner';
import { TrialBanner } from '@/components/TrialBanner';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { useDailyWelcome } from '@/hooks/useDailyWelcome';
import { BroadcastSheet } from '@/components/BroadcastSheet';
import { ErrorState } from '@/components/ErrorState';
import { RpeHeatmapGrid } from '@/components/charts/RpeHeatmapGrid';
import { useCoachAccess } from '@/hooks/useCoachAccess';
import { repository } from '@/data/repository';
import { ATHLETE_STATUS_LABEL, type Athlete, type AthleteStatus } from '@/data/types';
import { EVENT_GROUP_DIRECTION, EVENT_GROUP_LABEL, formatPerformance, type EventGroup } from '@/lib/formatPerformance';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { InfoTip } from '@/components/InfoTip';

type SortBy = 'name' | 'status' | 'class';
const SORT_LABEL: Record<SortBy, string> = { name: 'Name', status: 'Status', class: 'Class' };
const STATUS_SORT_ORDER: Record<AthleteStatus, number> = { active: 0, rest: 1, injured: 2, inactive: 3 };

const HEATMAP_LEGEND: { label: string; statusKey: 'onTrack' | 'borderline' | 'alert' | 'noLog' }[] = [
  { label: 'Low', statusKey: 'onTrack' },
  { label: 'Moderate', statusKey: 'borderline' },
  { label: 'High', statusKey: 'alert' },
  { label: 'Missing', statusKey: 'noLog' },
];

interface Row {
  athlete: Athlete;
  dotColor: string;
  pillLabel: string;
  pillTone: PillTone;
  subtitle: string;
  loggedThisWeek: boolean;
  thisWeekMark: number | null;
  thisWeekRpe: number | null;
  alertMessage: string | null;
}

export default function SquadScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, isStale, error, refresh } = useProgrammeData();
  const { access } = useCoachAccess();
  const programmeName = useAuthStore((s) => s.session?.programmeName) ?? 'Your programme';
  const welcome = useDailyWelcome();
  const [joinCode, setJoinCode] = React.useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeEventGroup, setActiveEventGroup] = useState<EventGroup | null>(null);
  const [activeStatus, setActiveStatus] = useState<AthleteStatus | null>(null);
  const [activeClassCategory, setActiveClassCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [viewMode, setViewMode] = useState<'list' | 'heatmap'>('list');
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [statSheet, setStatSheet] = useState<'logged' | 'missing' | 'alerts' | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

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

  // Dismissals are scoped per week_number, so switching to a new week naturally starts
  // with none dismissed — refetching here (rather than filtering a stale set) is what
  // keeps that true without any explicit "reset" step.
  useEffect(() => {
    if (currentWeek === 0) {
      setDismissedIds(new Set());
      return;
    }
    let cancelled = false;
    repository
      .getMissingLogDismissals(currentWeek)
      .then((ids) => {
        if (!cancelled) setDismissedIds(new Set(ids));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentWeek]);

  useEffect(() => {
    if (currentWeek === 0) {
      setDismissedAlertIds(new Set());
      return;
    }
    let cancelled = false;
    repository
      .getAlertDismissals(currentWeek)
      .then((ids) => {
        if (!cancelled) setDismissedAlertIds(new Set(ids));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentWeek]);

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

      const thisWeekLog = loggedThisWeek ? logs.find((l) => l.week === currentWeek) : undefined;
      const alertMessage = danger?.message ?? warning?.message ?? null;

      return {
        athlete,
        dotColor,
        pillLabel,
        pillTone,
        subtitle,
        loggedThisWeek,
        thisWeekMark: thisWeekLog?.mark ?? null,
        thisWeekRpe: thisWeekLog?.rpe ?? null,
        alertMessage,
      };
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

  const classCategories = useMemo(() => {
    const set = new Set(data.athletes.map((a) => a.classCategory).filter((c): c is string => !!c));
    return Array.from(set).sort();
  }, [data.athletes]);

  const visibleRows = useMemo(() => {
    let out = activeGroup ? eventGroupFilteredRows.filter((r) => r.athlete.group === activeGroup) : eventGroupFilteredRows;
    if (activeStatus) out = out.filter((r) => r.athlete.status === activeStatus);
    if (activeClassCategory) out = out.filter((r) => r.athlete.classCategory === activeClassCategory);
    out = [...out].sort((a, b) => {
      if (sortBy === 'status') return STATUS_SORT_ORDER[a.athlete.status] - STATUS_SORT_ORDER[b.athlete.status] || a.athlete.name.localeCompare(b.athlete.name);
      if (sortBy === 'class') return (a.athlete.classCategory ?? '').localeCompare(b.athlete.classCategory ?? '') || a.athlete.name.localeCompare(b.athlete.name);
      return a.athlete.name.localeCompare(b.athlete.name);
    });
    return out;
  }, [eventGroupFilteredRows, activeGroup, activeStatus, activeClassCategory, sortBy]);

  const activeFilterCount = (activeStatus ? 1 : 0) + (activeClassCategory ? 1 : 0) + (sortBy !== 'name' ? 1 : 0);

  const heatmapRows = useMemo(
    () =>
      eventGroupFilteredRows.map((r) => ({
        athleteId: r.athlete.id,
        name: r.athlete.name.split(' ')[0],
        cells: buildRpeRow(data.weeklyLogs[r.athlete.id] ?? [], 8, currentWeek),
      })),
    [eventGroupFilteredRows, data.weeklyLogs, currentWeek],
  );

  const heatmapFlags = useMemo(
    () =>
      eventGroupFilteredRows.flatMap((r) =>
        detectAnomalies(r.athlete, data.weeklyLogs[r.athlete.id] ?? [], data.strengthTests[r.athlete.id] ?? [], currentWeek),
      ),
    [eventGroupFilteredRows, data.weeklyLogs, data.strengthTests, currentWeek],
  );

  const loggedRows = rows.filter((r) => r.loggedThisWeek);
  const missingRows = rows.filter((r) => !r.loggedThisWeek && !dismissedIds.has(r.athlete.id));
  const alertRows = rows.filter((r) => r.pillTone !== 'success' && !dismissedAlertIds.has(r.athlete.id));
  const loggedCount = loggedRows.length;
  const missingCount = missingRows.length;
  const alertCount = alertRows.length;
  const statSheetRows = statSheet === 'logged' ? loggedRows : statSheet === 'missing' ? missingRows : statSheet === 'alerts' ? alertRows : [];
  const unreadNotifications = data.notifications.filter((n) => !n.read).length;

  function handleDismissMissing(athleteId: string) {
    setDismissedIds((prev) => new Set(prev).add(athleteId));
    repository.dismissMissingLog(athleteId, currentWeek).catch(() => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(athleteId);
        return next;
      });
    });
  }

  function handleDismissAlert(athleteId: string) {
    setDismissedAlertIds((prev) => new Set(prev).add(athleteId));
    repository.dismissAlert(athleteId, currentWeek).catch(() => {
      setDismissedAlertIds((prev) => {
        const next = new Set(prev);
        next.delete(athleteId);
        return next;
      });
    });
  }

  if (error && !loading && data.athletes.length === 0) return <ErrorState onRetry={refresh} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navBar, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.navText }} numberOfLines={1}>My Squad</Text>
            <Text style={{ fontSize: 13, color: colors.navText, opacity: 0.6, marginTop: 1 }} numberOfLines={1}>
              {programmeName} · {currentWeekLabel}
            </Text>
          </View>
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
            onPress={() => setFiltersVisible(true)}
            hitSlop={12}
            style={{ marginRight: 16 }}
            accessibilityRole="button"
            accessibilityLabel={activeFilterCount > 0 ? `Sort and filter, ${activeFilterCount} active` : 'Sort and filter'}
          >
            <View>
              <Ionicons name="filter-outline" size={19} color={colors.navText} />
              {activeFilterCount > 0 && (
                <View style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
              )}
            </View>
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
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          <StatBox value={loggedCount} label="Logged" bg={colors.successBg} fg={colors.success} onPress={() => setStatSheet('logged')} />
          <StatBox value={missingCount} label="Missing" bg={colors.dangerBg} fg={colors.danger} onPress={() => setStatSheet('missing')} />
          <StatBox value={alertCount} label="Alerts" bg={colors.warningBg} fg={colors.warning} onPress={() => setStatSheet('alerts')} />
        </View>
      </View>

      {welcome && <WelcomeBanner text={welcome} />}
      {access.isTrialing && <TrialBanner daysLeft={access.daysLeft} />}
      {isStale && <StaleBanner />}

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
        {(['list', 'heatmap'] as const).map((mode) => {
          const active = viewMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={mode === 'list' ? 'Squad list' : 'RPE heatmap'}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: active ? colors.accent : 'transparent',
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                {mode === 'list' ? 'Squad' : 'Heatmap'}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      {viewMode === 'list' && groups.length > 0 && (
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

      {viewMode === 'list' ? (
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
                    {row.athlete.status !== 'active' && (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: row.athlete.status === 'injured' ? colors.danger : colors.warning,
                          backgroundColor: row.athlete.status === 'injured' ? colors.dangerBg : colors.warningBg,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 8,
                        }}
                      >
                        {ATHLETE_STATUS_LABEL[row.athlete.status]}
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
                Add them yourself from the + above, or share your team code so they can sign up: {'\n'}
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
      ) : (
        <Screen onRefresh={refresh}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>RPE heatmap · Last 8 weeks</Text>
            <InfoTip
              term="RPE"
              explanation="Rate of Perceived Exertion — each athlete's self-reported effort score (1–10) for a week's training. This grid colors each week by how hard it felt, so you can spot squad-wide fatigue at a glance."
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {HEATMAP_LEGEND.map((l) => (
              <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: colors.statusColors[l.statusKey].text }} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{l.label}</Text>
              </View>
            ))}
          </View>

          <RpeHeatmapGrid rows={heatmapRows} />

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 }}>This week&apos;s flags</Text>
            {heatmapFlags.length === 0 && <Text style={{ fontSize: 15, color: colors.textMuted }}>No flags — squad looks steady.</Text>}
            {heatmapFlags.map((f, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(`/(coach)/athlete/${f.athleteId}`)}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, minHeight: 24, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ color: f.severity === 'danger' ? colors.danger : colors.warning }}>●</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>
                  {f.athleteName} — {f.message}
                </Text>
              </Pressable>
            ))}
          </View>
        </Screen>
      )}

      <BroadcastSheet visible={broadcastVisible} onClose={() => setBroadcastVisible(false)} athletes={data.athletes} />

      <Sheet visible={filtersVisible} onClose={() => setFiltersVisible(false)}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Sort & filter</Text>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Sort by</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(Object.keys(SORT_LABEL) as SortBy[]).map((s) => {
              const active = sortBy === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSortBy(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={SORT_LABEL[s]}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>{SORT_LABEL[s]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[null, ...(Object.keys(ATHLETE_STATUS_LABEL) as AthleteStatus[])].map((s) => {
              const active = activeStatus === s;
              const label = s ? ATHLETE_STATUS_LABEL[s] : 'All';
              return (
                <Pressable
                  key={s ?? 'all-status'}
                  onPress={() => setActiveStatus(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={label}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {classCategories.length > 0 && (
            <>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Class / category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[null, ...classCategories].map((c) => {
                  const active = activeClassCategory === c;
                  return (
                    <Pressable
                      key={c ?? 'all-class'}
                      onPress={() => setActiveClassCategory(c)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={c ?? 'All'}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? colors.accent : 'transparent',
                        borderWidth: active ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>{c ?? 'All'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Button
            label="Reset filters"
            variant="outline"
            onPress={() => {
              setActiveStatus(null);
              setActiveClassCategory(null);
              setSortBy('name');
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={statSheet != null} onClose={() => setStatSheet(null)} maxHeightPct="75%">
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            {statSheet === 'logged' ? `Logged this week (${loggedCount})` : statSheet === 'missing' ? `Missing this week (${missingCount})` : `Alerts (${alertCount})`}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {statSheetRows.length === 0 && <Text style={{ fontSize: 14, color: colors.textMuted }}>Nobody in this bucket.</Text>}
          {statSheetRows.map((row) => {
            const perfUnit = row.athlete.unit === 's' ? 'seconds' : 'metres';
            let detail: string;
            if (statSheet === 'logged') {
              detail = `${row.thisWeekMark != null ? formatPerformance(row.thisWeekMark, perfUnit) : 'No mark'}${row.thisWeekRpe != null ? ` · RPE ${row.thisWeekRpe}` : ''}`;
            } else if (statSheet === 'missing') {
              detail = 'No result logged this week';
            } else {
              detail = row.alertMessage ?? (row.loggedThisWeek ? row.pillLabel : 'No result logged this week');
            }
            return (
              <View
                key={row.athlete.id}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Pressable
                  onPress={() => {
                    setStatSheet(null);
                    router.push(`/(coach)/athlete/${row.athlete.id}`);
                  }}
                  style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: colors.text }}>{row.athlete.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{detail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
                {statSheet === 'missing' && (
                  <Pressable
                    onPress={() => handleDismissMissing(row.athlete.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss ${row.athlete.name} from missing this week`}
                    hitSlop={8}
                    style={{ paddingLeft: 12 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                  </Pressable>
                )}
                {statSheet === 'alerts' && (
                  <Pressable
                    onPress={() => handleDismissAlert(row.athlete.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss ${row.athlete.name} from alerts`}
                    hitSlop={8}
                    style={{ paddingLeft: 12 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

function StatBox({ value, label, bg, fg, onPress }: { value: number; label: string; bg: string; fg: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. See breakdown.`}
      style={({ pressed }) => [{ flex: 1, backgroundColor: bg, borderRadius: 8, paddingVertical: 8, alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={{ fontSize: 21, fontWeight: '600', color: fg }}>{value}</Text>
      <Text style={{ fontSize: 12, color: fg }}>{label}</Text>
    </Pressable>
  );
}
