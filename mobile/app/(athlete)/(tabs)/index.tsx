import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { generateWorkout } from '@/engine/workout';
import { repository } from '@/data/repository';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AthleteWorkoutScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, refresh } = useAthleteSelf();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const workout = useMemo(() => (data.athlete ? generateWorkout(data.athlete, data.mesocycleWeek) : null), [data.athlete, data.mesocycleWeek]);

  React.useEffect(() => {
    if (!data.athlete) return;
    repository.getWorkoutProgress(data.athlete.id, data.mesocycleWeek).then((ids) => {
      setCompletedIds(ids);
      setHydrated(true);
    });
  }, [data.athlete, data.mesocycleWeek]);

  async function toggleExercise(exerciseId: string) {
    if (!data.athlete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Optimistic update: flip locally first, persist in the background.
    setCompletedIds((prev) => (prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]));
    const authoritative = await repository.toggleWorkoutExercise(data.athlete.id, data.mesocycleWeek, exerciseId);
    setCompletedIds(authoritative);
  }

  if (!data.athlete || !workout) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const { squat, clean, bench } = data.athlete.currentMaxes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.text, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.background }}>Today&apos;s workout</Text>
        <Text style={{ fontSize: 11, color: colors.background, opacity: 0.6, marginTop: 1 }}>
          Week {workout.mesocycleWeek} · {Math.round(workout.intensityPct * 100)}% intensity
        </Text>
      </View>

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
          {workout.exercises[0].sets} × {workout.exercises[0].reps} sets · calculated from your maxes
        </Text>

        {workout.exercises.map((ex, i) => {
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
                    {ex.sets} × {ex.reps} @ {ex.weight} lbs
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
