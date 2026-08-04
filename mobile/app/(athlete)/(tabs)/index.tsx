import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { repository } from '@/data/repository';
import type { Workout } from '@/data/types';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { StaleBanner } from '@/components/StaleBanner';
import { computeExerciseWeight } from '@/engine/workoutWeight';
import { shareWorkout } from '@/lib/shareWorkout';

export default function AthleteWorkoutScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, isStale, refresh } = useAthleteSelf();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(true);

  useEffect(() => {
    setWorkoutLoading(true);
    repository
      .getWorkoutForWeek(data.mesocycleWeek)
      .then(setWorkout)
      .finally(() => setWorkoutLoading(false));
  }, [data.mesocycleWeek]);

  React.useEffect(() => {
    if (!data.athlete) return;
    repository.getWorkoutProgress(data.athlete.id, data.mesocycleWeek).then((ids) => {
      setCompletedIds(ids);
      setHydrated(true);
    });
  }, [data.athlete, data.mesocycleWeek]);

  const exercises = useMemo(() => {
    if (!workout || !data.athlete) return [];
    return workout.exercises.map((ex, i) => ({
      id: `${data.mesocycleWeek}-${i}-${ex.name}`,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: computeExerciseWeight(ex, workout.intensityPct, workout.roundingIncrement, data.athlete!.currentMaxes),
    }));
  }, [workout, data.athlete, data.mesocycleWeek]);

  async function toggleExercise(exerciseId: string) {
    if (!data.athlete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Optimistic update: flip locally first, persist in the background.
    setCompletedIds((prev) => (prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]));
    const authoritative = await repository.toggleWorkoutExercise(data.athlete.id, data.mesocycleWeek, exerciseId);
    setCompletedIds(authoritative);
  }

  if (loading || workoutLoading) return <LoadingState />;
  if (!data.athlete) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const { squat, clean, bench } = data.athlete.currentMaxes;
  // Any lift still at 0 means the coach hasn't entered a max for it yet — showing
  // "@ 0 lbs" for that exercise would be nonsensical, so treat it as not configured.
  const noMaxesYet = squat === 0 || clean === 0 || bench === 0;

  if (!workout || noMaxesYet) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ backgroundColor: colors.text, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.background }}>Today&apos;s workout</Text>
        </View>
        <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="barbell-outline" size={32} color={colors.textFaint} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
            No workout yet
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            {noMaxesYet
              ? "Your coach hasn't entered your 1RM maxes yet. Your personalized workout will appear here as soon as they do."
              : "Your coach hasn't published a workout for this week yet."}
          </Text>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.text, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.background }}>Today&apos;s workout</Text>
            <Text style={{ fontSize: 11, color: colors.background, opacity: 0.6, marginTop: 1 }}>
              Week {workout.weekNumber} · {Math.round(workout.intensityPct * 100)}% intensity
            </Text>
          </View>
          <Pressable
            onPress={() => shareWorkout(`${data.athlete?.name ?? 'My'} workout`, workout, exercises)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Export workout"
          >
            <Ionicons name="share-outline" size={19} color={colors.background} />
          </Pressable>
        </View>
      </View>

      {isStale && <StaleBanner />}

      <Screen onRefresh={refresh}>
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Your current maxes</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Text style={{ fontSize: 13, color: colors.text }}>
              Squat <Text style={{ fontWeight: '600' }}>{squat}</Text>
            </Text>
            <Text style={{ fontSize: 13, color: colors.text }}>
              Bench <Text style={{ fontWeight: '600' }}>{bench}</Text>
            </Text>
            <Text style={{ fontSize: 13, color: colors.text }}>
              Clean <Text style={{ fontWeight: '600' }}>{clean}</Text>
            </Text>
          </View>
        </Card>

        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
          Sets and weights calculated from your current maxes
        </Text>

        {exercises.map((ex, i) => {
          const done = hydrated && completedIds.includes(ex.id);
          return (
            <MotiView
              key={ex.id}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 200, delay: i * 40 }}
            >
              <Pressable
                onPress={() => toggleExercise(ex.id)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{ex.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {ex.sets} × {ex.reps}
                    {ex.weight != null ? ` @ ${ex.weight} lbs` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: done ? colors.accent : 'transparent',
                    borderWidth: done ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  {done && <Ionicons name="checkmark" size={13} color={colors.accentText} />}
                  <Text style={{ fontSize: 11, color: done ? colors.accentText : colors.textFaint }}>{done ? 'Done' : 'Mark done'}</Text>
                </View>
              </Pressable>
            </MotiView>
          );
        })}

        <Button label="Done — log my throw" onPress={() => router.push('/(athlete)/(tabs)/logger')} />
      </Screen>
    </View>
  );
}
