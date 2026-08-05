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
import type { BlockExercise, BlockType, Workout, WorkoutBlock } from '@/data/types';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { StaleBanner } from '@/components/StaleBanner';
import { computeExerciseWeight } from '@/engine/workoutWeight';
import { shareWorkout } from '@/lib/shareWorkout';
import { blockTypeDef } from '@/data/workoutBlocks';

const BLOCK_ICON: Record<BlockType, keyof typeof Ionicons.glyphMap> = {
  warm_up: 'walk-outline',
  olympic_lifts: 'barbell',
  weightlifting: 'barbell-outline',
  strength: 'barbell-outline',
  plyometrics: 'flash-outline',
  core_glutes: 'body-outline',
  med_ball_mobility: 'basketball-outline',
  technical_drills: 'list-outline',
  conditioning: 'pulse-outline',
  speed_work: 'speedometer-outline',
  speed_endurance: 'speedometer-outline',
  tempo: 'speedometer-outline',
  jump_reps: 'trending-up-outline',
  cool_down: 'snow-outline',
};

function exerciseLine(ex: BlockExercise, blockType: BlockType, weight: number | null): string {
  if (blockType === 'olympic_lifts' || blockType === 'weightlifting' || blockType === 'strength') {
    const parts: string[] = [];
    if (ex.sets != null && ex.repsPattern) parts.push(`${ex.sets} sets: ${ex.repsPattern}`);
    else if (ex.sets != null) parts.push(`${ex.sets} sets`);
    if (weight != null) parts.push(`@ ${weight} lbs`);
    else if (ex.pctOfMax != null) parts.push(`@ ${Math.round(ex.pctOfMax * 100)}%`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
    return parts.join(' · ');
  }
  if (blockType === 'speed_work' || blockType === 'speed_endurance' || blockType === 'tempo' || blockType === 'conditioning') {
    const head = [ex.repsPattern ? `${ex.repsPattern} ×` : null, ex.distanceMetres != null ? `${ex.distanceMetres}m` : null].filter(Boolean).join(' ');
    const tail = [
      ex.intensityPct != null ? `@ ${Math.round(ex.intensityPct * 100)}%` : null,
      ex.restSeconds != null ? `${ex.restSeconds}s rest` : 'Full recovery',
    ]
      .filter(Boolean)
      .join(' — ');
    return [head, tail].filter(Boolean).join(' ');
  }
  if (blockType === 'core_glutes') {
    if (ex.sets != null && ex.timeSeconds != null) return `${ex.sets} × ${ex.timeSeconds}s`;
    if (ex.sets != null && ex.repsPattern) return `${ex.sets} × ${ex.repsPattern}`;
    return ex.repsPattern ?? '';
  }
  if (blockType === 'plyometrics') {
    const parts: string[] = [];
    if (ex.sets != null && ex.repsPattern) parts.push(`${ex.sets} × ${ex.repsPattern}`);
    else if (ex.repsPattern) parts.push(ex.repsPattern);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
    return parts.join(' · ');
  }
  if (blockType === 'warm_up' || blockType === 'cool_down') {
    return ex.timeSeconds != null ? `${Math.round(ex.timeSeconds / 60)} min` : '';
  }
  if (blockType === 'jump_reps') {
    return ex.repsPattern ? `${ex.repsPattern} reps` : '';
  }
  if (blockType === 'technical_drills') {
    const parts: string[] = [];
    if (ex.sets != null && ex.repsPattern) parts.push(`${ex.sets} × ${ex.repsPattern}`);
    else if (ex.repsPattern) parts.push(ex.repsPattern);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
    return parts.join(' · ');
  }
  const generic = [ex.sets != null ? `${ex.sets} ×` : null, ex.repsPattern].filter(Boolean).join(' ');
  return generic;
}

export default function AthleteWorkoutScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, isStale, error, refresh } = useAthleteSelf();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setWorkoutLoading(true);
    repository
      .getWorkoutForWeek(data.mesocycleWeek)
      .then((w) => {
        setWorkout(w);
        if (w && w.blocks.length > 0) setExpandedBlocks(new Set([w.blocks[0].id]));
      })
      .finally(() => setWorkoutLoading(false));
  }, [data.mesocycleWeek]);

  React.useEffect(() => {
    if (!data.athlete) return;
    repository.getWorkoutProgress(data.athlete.id, data.mesocycleWeek).then((ids) => {
      setCompletedIds(ids);
      setHydrated(true);
    });
  }, [data.athlete, data.mesocycleWeek]);

  const eventGroup = data.athlete?.eventGroup ?? 'throws';

  const blockRows = useMemo(() => {
    if (!workout || !data.athlete) return [];
    const maxes = data.athlete.currentMaxes;
    return [...workout.blocks]
      .sort((a, b) => a.order - b.order)
      .map((block) => ({
        block,
        def: blockTypeDef(block.type, eventGroup),
        exercises: block.exercises.map((ex) => {
          const isLiftBlock = block.type === 'olympic_lifts' || block.type === 'weightlifting' || block.type === 'strength';
          const weight = isLiftBlock ? computeExerciseWeight(ex, workout.roundingIncrement, maxes) : null;
          return { ex, weight, key: `${block.id}:${ex.id}`, line: exerciseLine(ex, block.type, weight) };
        }),
      }));
  }, [workout, data.athlete, eventGroup]);

  function toggleBlock(blockId: string) {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }

  async function toggleExercise(exerciseKey: string) {
    if (!data.athlete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedIds((prev) => (prev.includes(exerciseKey) ? prev.filter((id) => id !== exerciseKey) : [...prev, exerciseKey]));
    const authoritative = await repository.toggleWorkoutExercise(data.athlete.id, data.mesocycleWeek, exerciseKey);
    setCompletedIds(authoritative);
  }

  if (loading || workoutLoading) return <LoadingState />;
  if (error && !data.athlete) return <ErrorState onRetry={refresh} />;
  if (!data.athlete) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const resultNoun = eventGroup === 'sprints' ? 'time' : eventGroup === 'jumps' ? 'jump' : 'throw';
  const { squat, clean, bench } = data.athlete.currentMaxes;

  if (!workout || workout.blocks.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ backgroundColor: colors.navBar, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.navText }}>Today&apos;s workout</Text>
        </View>
        <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="barbell-outline" size={32} color={colors.textFaint} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
            No workout yet
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            Your coach hasn&apos;t published a workout for this week yet.
          </Text>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navBar, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.navText }}>Today&apos;s workout</Text>
            <Text style={{ fontSize: 13, color: colors.navText, opacity: 0.6, marginTop: 1 }}>
              Week {workout.weekNumber} · {Math.round(workout.intensityPct * 100)}% intensity
            </Text>
          </View>
          <Pressable
            onPress={() => shareWorkout(`${data.athlete?.name ?? 'My'} workout`, workout, eventGroup, data.athlete!.currentMaxes)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Export workout"
          >
            <Ionicons name="share-outline" size={19} color={colors.navText} />
          </Pressable>
        </View>
      </View>

      {isStale && <StaleBanner />}

      <Screen onRefresh={refresh}>
        {(squat > 0 || clean > 0 || bench > 0) && (
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Your current maxes</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Text style={{ fontSize: 17, color: colors.text }}>
                Squat <Text style={{ fontWeight: '600' }}>{squat}</Text>
              </Text>
              <Text style={{ fontSize: 17, color: colors.text }}>
                Bench <Text style={{ fontWeight: '600' }}>{bench}</Text>
              </Text>
              <Text style={{ fontSize: 17, color: colors.text }}>
                Clean <Text style={{ fontWeight: '600' }}>{clean}</Text>
              </Text>
            </View>
          </Card>
        )}

        {blockRows.map(({ block, def, exercises }: { block: WorkoutBlock; def: ReturnType<typeof blockTypeDef>; exercises: { ex: BlockExercise; weight: number | null; key: string; line: string }[] }) => {
          const expanded = expandedBlocks.has(block.id);
          const color = def?.color ?? colors.surfaceAlt;
          const textColor = def?.textColor ?? colors.text;
          return (
            <View key={block.id} style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
              <Pressable
                onPress={() => toggleBlock(block.id)}
                style={{ backgroundColor: color, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${block.label}, ${expanded ? 'expanded' : 'collapsed'}`}
              >
                <Ionicons name={BLOCK_ICON[block.type] ?? 'ellipse-outline'} size={17} color={textColor} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, flex: 1 }}>{block.label}</Text>
                <Text style={{ fontSize: 11, color: textColor, opacity: 0.8 }}>{block.exercises.length}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={textColor} />
              </Pressable>

              {expanded && (
                <View style={{ backgroundColor: colors.surface, padding: 12 }}>
                  {exercises.map(({ ex, key, line }, i) => {
                    const done = hydrated && completedIds.includes(key);
                    return (
                      <MotiView
                        key={key}
                        from={{ opacity: 0, translateY: 6 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 200, delay: i * 30 }}
                      >
                        <Pressable
                          onPress={() => toggleExercise(key)}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingVertical: 10,
                            borderBottomWidth: i === exercises.length - 1 ? 0 : 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>{ex.name}</Text>
                            {!!line && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{line}</Text>}
                            {!!ex.coachingCue && (
                              <Text style={{ fontSize: 11, color: colors.textFaint, fontStyle: 'italic', marginTop: 2 }}>{ex.coachingCue}</Text>
                            )}
                            {!!ex.notes && <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 1 }}>{ex.notes}</Text>}
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
                            <Text style={{ fontSize: 13, color: done ? colors.accentText : colors.textFaint }}>{done ? 'Done' : 'Mark done'}</Text>
                          </View>
                        </Pressable>
                      </MotiView>
                    );
                  })}
                  {block.exercises.length === 0 && (
                    <Text style={{ fontSize: 12, color: colors.textFaint }}>No exercises in this block.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Button label={`Done — log my ${resultNoun}`} onPress={() => router.push('/(athlete)/(tabs)/logger')} />
      </Screen>
    </View>
  );
}
