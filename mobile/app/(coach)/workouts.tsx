import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository, defaultWorkoutTemplate } from '@/data/repository';
import { shareWorkout } from '@/lib/shareWorkout';
import type { Workout, WorkoutExercise, WorkoutLift } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';

const LIFT_OPTIONS: { value: WorkoutLift | null; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'clean', label: 'Clean' },
  { value: 'bench', label: 'Bench' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: null, label: 'None' },
];

export default function WorkoutPlansScreen() {
  const { colors } = useAppTheme();
  const [existingWeeks, setExistingWeeks] = useState<number[]>([]);
  const [week, setWeek] = useState(1);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repository.listWorkoutWeeks().then((weeks) => {
      setExistingWeeks(weeks);
      setWeek(weeks.length ? weeks[weeks.length - 1] : 1);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repository.getWorkoutForWeek(week).then((w) => {
      if (cancelled) return;
      setWorkout(w ?? defaultWorkoutTemplate(week));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [week]);

  const weekOptions = useMemo(() => {
    const maxKnown = Math.max(8, ...existingWeeks, week);
    return Array.from({ length: maxKnown + 1 }, (_, i) => i + 1);
  }, [existingWeeks, week]);

  function updateExercise(index: number, patch: Partial<WorkoutExercise>) {
    setWorkout((w) => {
      if (!w) return w;
      const exercises = w.exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex));
      return { ...w, exercises };
    });
  }

  function addExercise() {
    setWorkout((w) =>
      w
        ? { ...w, exercises: [...w.exercises, { name: '', sets: 3, reps: 5, lift: null, weightOverride: null }] }
        : w,
    );
  }

  function removeExercise(index: number) {
    setWorkout((w) => (w ? { ...w, exercises: w.exercises.filter((_, i) => i !== index) } : w));
  }

  async function handleSave() {
    if (!workout) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await repository.saveWorkout(workout);
      setWorkout(saved);
      setExistingWeeks((prev) => (prev.includes(week) ? prev : [...prev, week].sort((a, b) => a - b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save workout');
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    if (!workout) return;
    shareWorkout(
      `Week ${workout.weekNumber} plan`,
      workout,
      workout.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weightOverride,
      })),
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Workout plans"
        onBack={() => router.back()}
        rightIcon="share-outline"
        onRightPress={handleExport}
        rightLabel="Export plan"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 12, marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {weekOptions.map((w) => {
            const active = w === week;
            const saved = existingWeeks.includes(w);
            return (
              <Pressable
                key={w}
                onPress={() => setWeek(w)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? colors.accent : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: saved ? colors.text : colors.border,
                }}
              >
                <Text style={{ fontSize: 11, color: active ? colors.accentText : colors.textMuted }}>W{w}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {loading || !workout ? (
        <LoadingState />
      ) : (
        <Screen>
          <Card>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Week settings</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Intensity %"
                  keyboardType="decimal-pad"
                  value={String(Math.round(workout.intensityPct * 100))}
                  onChangeText={(t) => {
                    const pct = parseFloat(t) || 0;
                    setWorkout((w) => (w ? { ...w, intensityPct: pct / 100 } : w));
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Round to nearest (lbs)"
                  keyboardType="decimal-pad"
                  value={String(workout.roundingIncrement)}
                  onChangeText={(t) => {
                    const inc = parseFloat(t) || 5;
                    setWorkout((w) => (w ? { ...w, roundingIncrement: inc } : w));
                  }}
                />
              </View>
            </View>
          </Card>

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 8 }}>
            Exercises
          </Text>

          {workout.exercises.map((ex, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: colors.textFaint }}>Exercise {i + 1}</Text>
                <Pressable onPress={() => removeExercise(i)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
              <TextField label="Name" value={ex.name} onChangeText={(t) => updateExercise(i, { name: t })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Sets"
                    keyboardType="number-pad"
                    value={String(ex.sets)}
                    onChangeText={(t) => updateExercise(i, { sets: parseInt(t, 10) || 0 })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Reps"
                    keyboardType="number-pad"
                    value={String(ex.reps)}
                    onChangeText={(t) => updateExercise(i, { reps: parseInt(t, 10) || 0 })}
                  />
                </View>
              </View>

              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Scale from</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {LIFT_OPTIONS.map((opt) => {
                  const active = ex.lift === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      onPress={() => updateExercise(i, { lift: opt.value, weightOverride: opt.value ? null : ex.weightOverride })}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: active ? colors.accent : 'transparent',
                        borderWidth: active ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: active ? colors.accentText : colors.textMuted }}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {!ex.lift && (
                <TextField
                  label="Fixed weight (lbs, optional)"
                  keyboardType="decimal-pad"
                  value={ex.weightOverride != null ? String(ex.weightOverride) : ''}
                  onChangeText={(t) => updateExercise(i, { weightOverride: t ? parseFloat(t) : null })}
                  placeholder="Leave blank for bodyweight"
                />
              )}
            </Card>
          ))}

          <Button label="Add exercise" variant="outline" onPress={addExercise} />

          {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}
          <Button label="Save week" onPress={handleSave} loading={saving} />
        </Screen>
      )}
    </View>
  );
}
