import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { blockTypeDef } from '@/data/workoutBlocks';
import type { EventGroup, Meet, ProgrammeConfig, Workout } from '@/data/types';
import { addDays, formatCountdown, formatFullDate, getWeekLabel, weekDatesContaining, weekDayForDate } from '@/lib/calendarDates';
import { formatPerformance, inferEventGroup, type PerformanceUnit } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { WeekStrip } from '@/components/WeekStrip';
import { DayEventList, type DayCardData } from '@/components/DayEventList';
import { AddToCalendarButton } from '@/components/AddToCalendarButton';
import { Sheet } from '@/components/Sheet';
import { MEET_TYPE_LABEL } from '@/screens/MeetsScreen';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AthleteCalendarScreen() {
  const { colors } = useAppTheme();
  const { data, loading: selfLoading } = useAthleteSelf();
  const [config, setConfig] = useState<ProgrammeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [workoutCache, setWorkoutCache] = useState<Record<number, Workout | null>>({});
  const [meetSheet, setMeetSheet] = useState<Meet | null>(null);

  const seasonStartDate = config?.seasonStartDate ?? null;
  const primaryGroup: EventGroup = data.athlete?.eventGroup ?? 'throws';

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
    const numbers = new Set<number>();
    for (const d of weekDates) {
      const wd = weekDayForDate(seasonStartDate, d);
      if (wd) numbers.add(wd.weekNumber);
    }
    return Array.from(numbers);
  }, [seasonStartDate, weekDates]);

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

  const cards: DayCardData[] = [
    ...(selectedWeekDay && selectedBlocks.length > 0
      ? [{
          kind: 'training' as const,
          weekNumber: selectedWeekDay.weekNumber,
          day: selectedWeekDay.day,
          blockLabels: selectedBlocks.map((b) => b.label || blockTypeDef(b.type, primaryGroup)?.label || b.type),
        }]
      : []),
    ...data.meets
      .filter((m) => m.date === selectedDate)
      .map((m) => ({ kind: 'meet' as const, id: m.id, name: m.name, location: m.location })),
  ];

  const upcomingMeets = data.meets.filter((m) => new Date(`${m.date}T00:00:00Z`).getTime() >= new Date(`${todayIso()}T00:00:00Z`).getTime()).slice(0, 3);
  const meetsById = useMemo(() => new Map(data.meets.map((m) => [m.id, m])), [data.meets]);

  if (configLoading || selfLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Calendar" />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Calendar" />
      <Screen>
        {!seasonStartDate && (
          <Card>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              Your coach hasn&apos;t set a season start date yet, so training dates aren&apos;t shown — meets still are.
            </Text>
          </Card>
        )}

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

        <View style={{ marginTop: 16 }}>
          <DayEventList
            cards={cards}
            onPressMeet={(card) => setMeetSheet(meetsById.get(card.id) ?? null)}
            renderExtra={(card) =>
              card.kind === 'training' ? (
                <AddToCalendarButton
                  appKey={`training-${card.weekNumber}-${card.day}`}
                  title="Training session"
                  startDate={new Date(`${selectedDate}T06:00:00`)}
                  endDate={new Date(`${selectedDate}T08:00:00`)}
                  notes={card.blockLabels.join(', ')}
                />
              ) : (() => {
                const meetDate = meetsById.get(card.id)?.date ?? selectedDate;
                return (
                  <AddToCalendarButton
                    appKey={card.id}
                    title={card.name}
                    startDate={new Date(`${meetDate}T09:00:00`)}
                    endDate={new Date(`${meetDate}T17:00:00`)}
                    location={card.location ?? undefined}
                  />
                );
              })()
            }
          />
        </View>

        {upcomingMeets.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Upcoming meets
            </Text>
            {upcomingMeets.map((m) => (
              <Pressable key={m.id} onPress={() => setMeetSheet(m)}>
                <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.warning }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{m.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{formatCountdown(m.date)}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>

      <Sheet visible={meetSheet != null} onClose={() => setMeetSheet(null)}>
        {meetSheet && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{meetSheet.name}</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 12 }}>
              {formatFullDate(meetSheet.date)}
              {meetSheet.location ? ` · ${meetSheet.location}` : ''}
            </Text>
            {meetSheet.meetType && (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>{MEET_TYPE_LABEL[meetSheet.meetType]}</Text>
            )}
            {meetSheet.conditions && (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Conditions: {meetSheet.conditions}</Text>
            )}
            {meetSheet.generalNotes && (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>{meetSheet.generalNotes}</Text>
            )}
            {(() => {
              const event = data.athlete?.event;
              const standard = event ? meetSheet.standards[event] : undefined;
              if (standard == null) return null;
              const unit: PerformanceUnit = inferEventGroup(event!) === 'sprints' ? 'seconds' : 'metres';
              return (
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 8 }}>
                  Qualifying standard for {event}: {formatPerformance(standard, unit)}
                </Text>
              );
            })()}
          </View>
        )}
      </Sheet>
    </View>
  );
}
