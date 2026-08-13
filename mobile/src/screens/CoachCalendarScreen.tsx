import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { blockTypeDef } from '@/data/workoutBlocks';
import { DAY_LABELS, type EventGroup, type ProgrammeConfig, type Workout } from '@/data/types';
import { addDays, formatFullDate, getWeekLabel, isMonday, mondayOfIso, weekDatesContaining, weekDayForDate } from '@/lib/calendarDates';
import { exportScheduleAsIcs } from '@/lib/exportSchedule';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { Sheet } from '@/components/Sheet';
import { WeekStrip } from '@/components/WeekStrip';
import { MonthGrid } from '@/components/MonthGrid';
import { DayEventList, type TrainingCardData } from '@/components/DayEventList';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CoachCalendarScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, loading: squadLoading } = useProgrammeData();
  const [config, setConfig] = useState<ProgrammeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [monthAnchor, setMonthAnchor] = useState(todayIso());
  const [workoutCache, setWorkoutCache] = useState<Record<number, Workout | null>>({});
  const [seasonStartInput, setSeasonStartInput] = useState('');
  const [savingSeasonStart, setSavingSeasonStart] = useState(false);
  const [copySheetDay, setCopySheetDay] = useState<TrainingCardData | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const seasonStartDate = config?.seasonStartDate ?? null;
  // Training weeks are only defined from the season start date forward — weekDayForDate
  // returns null for anything earlier, which openWorkoutBuilder silently no-ops on. Surface
  // that as a visible, disabled state instead of a dead-looking + button.
  const beforeSeason = seasonStartDate != null && selectedDate < seasonStartDate;
  const primaryGroup: EventGroup = config?.eventGroups[0] ?? 'throws';

  useEffect(() => {
    repository
      .getProgrammeConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  const weekDates = useMemo(() => weekDatesContaining(selectedDate), [selectedDate]);

  const visibleWeekNumbers = useMemo(() => {
    if (!seasonStartDate) return [];
    const dates = viewMode === 'week' ? weekDates : monthGridDates(monthAnchor);
    const numbers = new Set<number>();
    for (const d of dates) {
      const wd = weekDayForDate(seasonStartDate, d);
      if (wd) numbers.add(wd.weekNumber);
    }
    return Array.from(numbers);
  }, [seasonStartDate, viewMode, weekDates, monthAnchor]);

  useEffect(() => {
    const missing = visibleWeekNumbers.filter((w) => !(w in workoutCache));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map((w) => repository.getWorkoutForWeek(w).catch(() => null))).then((results) => {
      if (cancelled) return;
      setWorkoutCache((prev) => {
        const next = { ...prev };
        missing.forEach((w, i) => {
          next[w] = results[i];
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleWeekNumbers]);

  function hasTraining(date: string): boolean {
    if (!seasonStartDate) return false;
    const wd = weekDayForDate(seasonStartDate, date);
    if (!wd) return false;
    const workout = workoutCache[wd.weekNumber];
    if (!workout) return false;
    return workout.blocks.some((b) => b.day === wd.day || b.day === null);
  }

  function hasMeet(date: string): boolean {
    return data.meets.some((m) => m.date === date);
  }

  const selectedWeekDay = seasonStartDate ? weekDayForDate(seasonStartDate, selectedDate) : null;
  const selectedWorkout = selectedWeekDay ? workoutCache[selectedWeekDay.weekNumber] ?? null : null;
  const selectedBlocks = selectedWeekDay && selectedWorkout
    ? selectedWorkout.blocks.filter((b) => b.day === selectedWeekDay.day || b.day === null)
    : [];

  const trainingCard: TrainingCardData | null =
    selectedWeekDay && selectedBlocks.length > 0
      ? {
          kind: 'training',
          weekNumber: selectedWeekDay.weekNumber,
          day: selectedWeekDay.day,
          blockLabels: selectedBlocks.map((b) => b.label || blockTypeDef(b.type, primaryGroup)?.label || b.type),
          athleteCount: data.athletes.length,
        }
      : null;

  const meetCards = data.meets
    .filter((m) => m.date === selectedDate)
    .map((m) => ({ kind: 'meet' as const, id: m.id, name: m.name, location: m.location }));

  const cards = trainingCard ? [trainingCard, ...meetCards] : meetCards;

  // Workout editing lives on its own Workouts tab (not a Calendar-owned sheet) — jumping there
  // with the week/day this date resolves to is what lets that tab open pre-scoped to this day.
  function openWorkoutBuilder() {
    if (!seasonStartDate) return;
    const wd = weekDayForDate(seasonStartDate, selectedDate);
    if (!wd) return;
    router.push(`/(coach)/(tabs)/workouts?week=${wd.weekNumber}&day=${wd.day}`);
  }

  async function handleSaveSeasonStart() {
    setSavingSeasonStart(true);
    try {
      await repository.updateSeasonStartDate(seasonStartInput || null);
      const updated = await repository.getProgrammeConfig();
      setConfig(updated);
    } catch {
      // Inline field stays editable — nothing else to recover.
    } finally {
      setSavingSeasonStart(false);
    }
  }

  async function handleCopyToDay(targetDay: number) {
    if (!copySheetDay) return;
    setCopyBusy(true);
    try {
      // Use the returned Workout directly rather than invalidating the cache entry and waiting
      // on the prefetch effect — that effect only depends on visibleWeekNumbers, so a cache
      // deletion for a week that's already visible would never trigger a refetch.
      const updated = await repository.copyWorkoutDay(copySheetDay.weekNumber, copySheetDay.day, targetDay);
      setWorkoutCache((prev) => ({ ...prev, [copySheetDay.weekNumber]: updated }));
      setCopySheetDay(null);
    } catch {
      // Sheet stays open so the coach can retry.
    } finally {
      setCopyBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const dates = viewMode === 'week' ? weekDates : monthGridDates(monthAnchor);
      const trainingEvents = seasonStartDate
        ? dates
            .map((d) => {
              const wd = weekDayForDate(seasonStartDate, d);
              const workout = wd ? workoutCache[wd.weekNumber] : null;
              const blocks = wd && workout ? workout.blocks.filter((b) => b.day === wd.day || b.day === null) : [];
              if (blocks.length === 0) return null;
              return {
                uid: `training-${d}@truperformance`,
                title: 'Training session',
                startDate: new Date(`${d}T06:00:00`),
                endDate: new Date(`${d}T08:00:00`),
                description: blocks.map((b) => b.label || b.type).join(', '),
              };
            })
            .filter((e): e is NonNullable<typeof e> => e != null)
        : [];
      const meetEvents = data.meets.map((m) => ({
        uid: `meet-${m.id}@truperformance`,
        title: m.name,
        startDate: new Date(`${m.date}T09:00:00`),
        endDate: new Date(`${m.date}T17:00:00`),
        location: m.location ?? undefined,
      }));
      await exportScheduleAsIcs([...trainingEvents, ...meetEvents]);
    } finally {
      setExporting(false);
    }
  }

  if (configLoading || squadLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Calendar" />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Calendar" rightIcon="share-outline" onRightPress={handleExport} rightLabel="Export schedule" />
      <Screen>
        {!seasonStartDate && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Set your season start date</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 10 }}>
              This anchors training weeks to real calendar dates — the Monday of week 1.
            </Text>
            <DateField label="Season start date" value={seasonStartInput} onChange={setSeasonStartInput} />
            {seasonStartInput.length > 0 && !isMonday(seasonStartInput) && (
              <Text style={{ fontSize: 12, color: colors.warning, marginTop: -4, marginBottom: 8 }}>
                That date isn&apos;t a Monday — week dates are computed assuming week 1 starts on one.
              </Text>
            )}
            <Button label="Save" onPress={handleSaveSeasonStart} loading={savingSeasonStart} />
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            onPress={() => setViewMode('week')}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: viewMode === 'week' ? colors.accent : 'transparent', borderWidth: viewMode === 'week' ? 0 : 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'week' ? colors.accentText : colors.textMuted }}>Week</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('month')}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: viewMode === 'month' ? colors.accent : 'transparent', borderWidth: viewMode === 'month' ? 0 : 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'month' ? colors.accentText : colors.textMuted }}>Month</Text>
          </Pressable>
        </View>

        {viewMode === 'week' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Pressable onPress={() => setSelectedDate((d) => addDays(d, -7))} accessibilityRole="button" accessibilityLabel="Previous week" style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => setSelectedDate(todayIso())}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{getWeekLabel(new Date(`${weekDates[0]}T00:00:00`))}</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedDate((d) => addDays(d, 7))} accessibilityRole="button" accessibilityLabel="Next week" style={{ padding: 6 }}>
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </Pressable>
            </View>
            <WeekStrip weekDates={weekDates} selectedDate={selectedDate} onSelectDate={setSelectedDate} hasTraining={hasTraining} hasMeet={hasMeet} />
          </>
        ) : (
          <MonthGrid
            monthAnchor={monthAnchor}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setViewMode('week');
            }}
            onChangeMonth={(delta) =>
              setMonthAnchor((m) => {
                const [y, mo] = [Number(m.slice(0, 4)), Number(m.slice(5, 7))];
                const next = new Date(Date.UTC(y, mo - 1 + delta, 1));
                return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
              })
            }
            hasTraining={hasTraining}
            hasMeet={hasMeet}
          />
        )}

        <View style={{ marginTop: 16 }}>
          <DayEventList
            cards={cards}
            onPressTraining={openWorkoutBuilder}
            onLongPressTraining={(card) => setCopySheetDay(card)}
            onPressMeet={(card) => router.push(`/(coach)/meets/${card.id}`)}
          />
          {beforeSeason && (
            <Text style={{ fontSize: 12, color: colors.warning, textAlign: 'center', marginTop: 8 }}>
              This date is before your season start ({formatFullDate(seasonStartDate!)}) — pick a later date to add a workout.
            </Text>
          )}
        </View>
      </Screen>

      <Pressable
        onPress={openWorkoutBuilder}
        accessibilityRole="button"
        accessibilityLabel="Add session"
        disabled={!seasonStartDate || beforeSeason}
        style={({ pressed }) => [{
          position: 'absolute',
          right: 20,
          bottom: 24 + insets.bottom,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : seasonStartDate && !beforeSeason ? 1 : 0.4,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }]}
      >
        <Ionicons name="add" size={26} color={colors.accentText} />
      </Pressable>

      <Sheet visible={copySheetDay != null} onClose={() => setCopySheetDay(null)}>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Copy session to another day</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
            Duplicates this day&apos;s blocks into the day you pick, within the same week.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {DAY_LABELS.map((label, i) => {
              const day = i + 1;
              const isSource = copySheetDay?.day === day;
              return (
                <Pressable
                  key={day}
                  disabled={isSource || copyBusy}
                  onPress={() => handleCopyToDay(day)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, opacity: isSource ? 0.4 : 1 }}
                >
                  <Text style={{ fontSize: 13, color: colors.text }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

function monthGridDates(monthAnchor: string): string[] {
  const firstOfMonth = `${monthAnchor.slice(0, 7)}-01`;
  const gridStart = mondayOfIso(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}
