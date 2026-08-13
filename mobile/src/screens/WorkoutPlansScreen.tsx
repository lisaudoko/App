import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository, defaultWorkoutTemplate } from '@/data/repository';
import { shareWorkout } from '@/lib/shareWorkout';
import { computeExerciseWeight } from '@/engine/workoutWeight';
import { genId } from '@/lib/id';
import { DAY_LABELS, todayAsWorkoutDay, type BlockExercise, type EventGroup, type Workout, type WorkoutBlock } from '@/data/types';
import { blockChoicesForGroups, blockTypeDef, type BlockTypeDef } from '@/data/workoutBlocks';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { Sheet } from '@/components/Sheet';

function emptyExercise(name: string): BlockExercise {
  return {
    id: genId(),
    name,
    category: null,
    sets: null,
    repsPattern: null,
    pctOfMax: null,
    weightLbs: null,
    distanceMetres: null,
    intensityPct: null,
    restSeconds: null,
    timeSeconds: null,
    coachingCue: null,
    notes: null,
  };
}

function blocksFromGenerated(
  generated: { type: WorkoutBlock['type']; label: string; exercises: Omit<BlockExercise, 'id' | 'category' | 'weightLbs'>[] }[],
  day: number | null,
  orderStart: number,
): WorkoutBlock[] {
  return generated.map((b, i) => ({
    id: genId(),
    type: b.type,
    label: b.label,
    order: orderStart + i,
    exercises: b.exercises.map((e) => ({ ...e, id: genId(), category: null, weightLbs: null })),
    day,
  }));
}

function describeExercise(ex: BlockExercise, blockType: WorkoutBlock['type'], maxes: { squat: number; clean: number; bench: number; deadlift: number } | null): string {
  const parts: string[] = [];
  if (blockType === 'olympic_lifts' || blockType === 'weightlifting' || blockType === 'strength') {
    if (ex.sets != null) parts.push(`${ex.sets} sets`);
    if (ex.repsPattern) parts.push(ex.repsPattern);
    const weight = maxes ? computeExerciseWeight(ex, 5, maxes) : ex.weightLbs;
    if (weight != null) parts.push(`@ ${weight} lbs`);
    else if (ex.pctOfMax != null) parts.push(`@ ${Math.round(ex.pctOfMax * 100)}%`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
  } else if (blockType === 'technical_drills') {
    if (ex.sets != null && ex.repsPattern) parts.push(`${ex.sets} × ${ex.repsPattern}`);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
  } else if (blockType === 'speed_work' || blockType === 'speed_endurance' || blockType === 'tempo' || blockType === 'conditioning') {
    if (ex.repsPattern) parts.push(`${ex.repsPattern} ×`);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
    if (ex.intensityPct != null) parts.push(`@ ${Math.round(ex.intensityPct * 100)}%`);
    if (ex.restSeconds != null) parts.push(`${ex.restSeconds}s rest`);
  } else if (blockType === 'core_glutes') {
    if (ex.sets != null) parts.push(`${ex.sets} ×`);
    if (ex.timeSeconds != null) parts.push(`${ex.timeSeconds}s`);
    else if (ex.repsPattern) parts.push(ex.repsPattern);
  } else if (blockType === 'plyometrics') {
    if (ex.sets != null) parts.push(`${ex.sets} ×`);
    if (ex.repsPattern) parts.push(ex.repsPattern);
    if (ex.distanceMetres != null) parts.push(`${ex.distanceMetres}m`);
  } else if (blockType === 'warm_up' || blockType === 'cool_down') {
    if (ex.timeSeconds != null) parts.push(`${Math.round(ex.timeSeconds / 60)} min`);
  } else if (blockType === 'jump_reps') {
    if (ex.repsPattern) parts.push(`${ex.repsPattern} reps`);
  } else {
    if (ex.sets != null) parts.push(`${ex.sets} ×`);
    if (ex.repsPattern) parts.push(ex.repsPattern);
  }
  return parts.join(' · ') || 'Tap to set details';
}

export function WorkoutPlansScreen({
  onBack,
  initialWeek,
  initialDay,
}: { onBack?: () => void; initialWeek?: number; initialDay?: number | null } = {}) {
  const { colors } = useAppTheme();
  const [existingWeeks, setExistingWeeks] = useState<number[]>([]);
  const [week, setWeek] = useState(initialWeek ?? 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(initialDay !== undefined ? initialDay : null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [daySaved, setDaySaved] = useState(false);
  const [addBlockVisible, setAddBlockVisible] = useState(false);
  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [generateVisible, setGenerateVisible] = useState(false);
  const [generateFocus, setGenerateFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    repository.getProgrammeConfig().then((c) => setEventGroups(c?.eventGroups ?? [])).catch(() => {});
    repository
      .listWorkoutWeeks()
      .then((weeks) => {
        setExistingWeeks(weeks);
        // A date-jump from the Calendar screen supplies initialWeek explicitly — don't clobber
        // it back to "latest week" once the real list of existing weeks comes in.
        if (initialWeek == null) setWeek(weeks.length ? weeks[weeks.length - 1] : 1);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repository
      .getWorkoutForWeek(week)
      .then((w) => {
        if (cancelled) return;
        setWorkout(w ?? defaultWorkoutTemplate(week));
      })
      .catch(() => {
        if (!cancelled) setWorkout(defaultWorkoutTemplate(week));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [week]);

  const weekOptions = useMemo(() => {
    const maxKnown = Math.max(8, ...existingWeeks, week);
    return Array.from({ length: maxKnown + 1 }, (_, i) => i + 1);
  }, [existingWeeks, week]);

  const blockChoices = useMemo(() => blockChoicesForGroups(eventGroups), [eventGroups]);
  const primaryGroup: EventGroup = eventGroups[0] ?? 'throws';

  function updateBlocks(fn: (blocks: WorkoutBlock[]) => WorkoutBlock[]) {
    setWorkout((w) => (w ? { ...w, blocks: fn(w.blocks) } : w));
  }

  function addBlock(def: BlockTypeDef & { displayLabel: string }) {
    updateBlocks((blocks) => [
      ...blocks,
      { id: genId(), type: def.type, label: def.displayLabel, order: blocks.length, exercises: [], day: selectedDay },
    ]);
    setAddBlockVisible(false);
  }

  function removeBlock(blockId: string) {
    updateBlocks((blocks) => blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i })));
  }

  function moveBlock(blockId: string, dir: -1 | 1) {
    updateBlocks((blocks) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return blocks;
      // Reorder within the block's own day only — the underlying array can interleave
      // days, so "up/down" must move relative to day-mates, not raw array neighbors.
      const dayIds = blocks.filter((b) => (b.day ?? null) === (block.day ?? null)).map((b) => b.id);
      const posInDay = dayIds.indexOf(blockId);
      const targetPosInDay = posInDay + dir;
      if (posInDay < 0 || targetPosInDay < 0 || targetPosInDay >= dayIds.length) return blocks;
      const otherId = dayIds[targetPosInDay];
      const idxA = blocks.findIndex((b) => b.id === blockId);
      const idxB = blocks.findIndex((b) => b.id === otherId);
      const copy = [...blocks];
      [copy[idxA], copy[idxB]] = [copy[idxB], copy[idxA]];
      return copy.map((b, i) => ({ ...b, order: i }));
    });
  }

  function addExercise(blockId: string, name: string) {
    updateBlocks((blocks) => blocks.map((b) => (b.id === blockId ? { ...b, exercises: [...b.exercises, emptyExercise(name)] } : b)));
    setPickerBlockId(null);
    setPickerSearch('');
  }

  function updateExercise(blockId: string, exerciseId: string, patch: Partial<BlockExercise>) {
    updateBlocks((blocks) =>
      blocks.map((b) =>
        b.id === blockId ? { ...b, exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) } : b,
      ),
    );
  }

  function removeExercise(blockId: string, exerciseId: string) {
    updateBlocks((blocks) => blocks.map((b) => (b.id === blockId ? { ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) } : b)));
  }

  function moveExercise(blockId: string, exerciseId: string, dir: -1 | 1) {
    updateBlocks((blocks) =>
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        const idx = b.exercises.findIndex((e) => e.id === exerciseId);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= b.exercises.length) return b;
        const copy = [...b.exercises];
        [copy[idx], copy[target]] = [copy[target], copy[idx]];
        return { ...b, exercises: copy };
      }),
    );
  }

  // A General (day: null) block applies to every day, so it genuinely satisfies any given
  // day's "has content" requirement on its own — a coach who covers a day entirely with a
  // General block shouldn't be blocked from finishing the week over it.
  function dayHasContent(blocks: WorkoutBlock[], day: number): boolean {
    return blocks.some((b) => b.day === day) || blocks.some((b) => b.day === null);
  }

  const allDaysHaveContent = workout ? ([1, 2, 3, 4, 5, 6, 7] as const).every((d) => dayHasContent(workout.blocks, d)) : false;

  /** Persists the whole week draft (there's no per-day DB row — workouts is one row per
   *  programme+week, so this is the same call handleSave makes), but only requires the
   *  currently selected day to have content. This lets a coach build up a week's plan one
   *  day at a time without every other day already being finished. */
  async function saveDay() {
    if (!workout) return;
    if (visibleBlocks.length === 0) {
      setError(selectedDay == null ? 'Add at least one general block before saving.' : `Add at least one block for ${DAY_LABELS[selectedDay - 1]} before saving.`);
      return;
    }
    setSavingDay(true);
    setError(null);
    setDaySaved(false);
    try {
      const saved = await repository.saveWorkout(workout);
      setWorkout(saved);
      setExistingWeeks((prev) => (prev.includes(week) ? prev : [...prev, week].sort((a, b) => a - b)));
      setDaySaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that day');
    } finally {
      setSavingDay(false);
    }
  }

  async function handleSave() {
    if (!workout) return;
    if (!allDaysHaveContent) {
      setError('Every day (Mon–Sun) needs at least one block before you can save the week.');
      return;
    }
    setSaving(true);
    setError(null);
    setDaySaved(false);
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

  async function handleGenerate() {
    if (!workout) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const { blocks } = await repository.generateWorkout({
        eventGroup: primaryGroup,
        weekNumber: week,
        intensityPct: workout.intensityPct,
        focus: generateFocus.trim() || undefined,
      });
      setWorkout((w) => {
        if (!w) return w;
        const kept = w.blocks.filter((b) => (b.day ?? null) !== selectedDay);
        const fresh = blocksFromGenerated(blocks, selectedDay, kept.length);
        return { ...w, blocks: [...kept, ...fresh] };
      });
      setGenerateVisible(false);
      setGenerateFocus('');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Could not generate a workout');
    } finally {
      setGenerating(false);
    }
  }

  function handleExport() {
    if (!workout) return;
    shareWorkout(`Week ${workout.weekNumber} plan`, workout, primaryGroup, null);
  }

  const visibleBlocks = workout?.blocks.filter((b) => (b.day ?? null) === selectedDay) ?? [];
  const pickerBlock = workout?.blocks.find((b) => b.id === pickerBlockId) ?? null;
  const pickerDef = pickerBlock ? blockTypeDef(pickerBlock.type, primaryGroup) : null;
  const pickerResults = pickerDef?.exercises.filter((n) => n.toLowerCase().includes(pickerSearch.toLowerCase())) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Workout plans"
        onBack={onBack}
        rightIcon="share-outline"
        onRightPress={handleExport}
        rightLabel="Export plan"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 12, marginBottom: 4, flexGrow: 0 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {weekOptions.map((w) => {
            const active = w === week;
            const saved = existingWeeks.includes(w);
            return (
              <Pressable
                key={w}
                onPress={() => setWeek(w)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Week ${w}${saved ? ', saved' : ', not saved yet'}`}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? colors.accent : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: saved ? colors.text : colors.border,
                }}
              >
                <Text style={{ fontSize: 12, color: active ? colors.accentText : colors.textMuted }}>W{w}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginBottom: 4, flexGrow: 0 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {[null, ...([1, 2, 3, 4, 5, 6, 7] as const)].map((d) => {
            const active = selectedDay === d;
            const label = d == null ? 'General' : DAY_LABELS[d - 1];
            const count = workout?.blocks.filter((b) => (b.day ?? null) === d).length ?? 0;
            return (
              <Pressable
                key={d ?? 'general'}
                onPress={() => setSelectedDay(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}${count > 0 ? `, ${count} block${count === 1 ? '' : 's'}` : ''}`}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? colors.text : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? colors.text : colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.background : colors.textMuted }}>
                  {label}
                  {count > 0 ? ` (${count})` : ''}
                </Text>
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
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Week settings</Text>
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

          <Button
            label="Generate week with AI"
            variant="outline"
            onPress={() => {
              setGenerateError(null);
              setGenerateVisible(true);
            }}
          />

          {visibleBlocks.map((block, i) => {
            const def = blockTypeDef(block.type, primaryGroup);
            const color = def?.color ?? colors.surfaceAlt;
            const textColor = def?.textColor ?? colors.text;
            return (
              <Card key={block.id} style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ backgroundColor: color, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textColor, flex: 1 }}>{block.label}</Text>
                  <Pressable onPress={() => moveBlock(block.id, -1)} disabled={i === 0} hitSlop={8} accessibilityRole="button" accessibilityLabel="Move block up">
                    <Ionicons name="chevron-up" size={18} color={textColor} style={{ opacity: i === 0 ? 0.3 : 1 }} />
                  </Pressable>
                  <Pressable onPress={() => moveBlock(block.id, 1)} disabled={i === visibleBlocks.length - 1} hitSlop={8} accessibilityRole="button" accessibilityLabel="Move block down">
                    <Ionicons name="chevron-down" size={18} color={textColor} style={{ opacity: i === visibleBlocks.length - 1 ? 0.3 : 1 }} />
                  </Pressable>
                  <Pressable onPress={() => removeBlock(block.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${block.label} block`}>
                    <Ionicons name="trash-outline" size={17} color={textColor} />
                  </Pressable>
                </View>

                <View style={{ padding: 12 }}>
                  {block.exercises.map((ex) => {
                    const key = `${block.id}:${ex.id}`;
                    const expanded = expandedKey === key;
                    return (
                      <View key={ex.id} style={{ marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 }}>
                        <Pressable
                          onPress={() => setExpandedKey(expanded ? null : key)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{ex.name}</Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{describeExercise(ex, block.type, null)}</Text>
                          </View>
                          <Pressable onPress={() => removeExercise(block.id, ex.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${ex.name}`}>
                            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                          </Pressable>
                          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
                        </Pressable>

                        {expanded && (
                          <View style={{ marginTop: 10 }}>
                            <ExerciseFieldsForm
                              exercise={ex}
                              fields={def?.fields ?? []}
                              blockType={block.type}
                              onChange={(patch) => updateExercise(block.id, ex.id, patch)}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}

                  <Button
                    label="Add exercise"
                    variant="outline"
                    onPress={() => {
                      setPickerBlockId(block.id);
                      setPickerSearch('');
                    }}
                  />
                </View>
              </Card>
            );
          })}

          {visibleBlocks.length === 0 && (
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
              {selectedDay == null
                ? 'No general blocks yet — these apply every day of the week. Add one, or switch to a specific day above.'
                : `No blocks for ${DAY_LABELS[selectedDay - 1]} yet — add one below.`}
            </Text>
          )}

          <Button label="Add block" onPress={() => setAddBlockVisible(true)} />

          {error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 8, marginBottom: 8 }}>{error}</Text>}
          {daySaved && !error && <Text style={{ color: colors.success, fontSize: 12, marginTop: 8, marginBottom: 8 }}>Day saved.</Text>}

          <Button label="Save day" variant="outline" onPress={saveDay} loading={savingDay} disabled={visibleBlocks.length === 0} />
          <Button label="Save week" onPress={handleSave} loading={saving} disabled={!allDaysHaveContent} />
          {!allDaysHaveContent && (
            <Text style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: -4 }}>
              Every day (Mon–Sun) needs at least one block before you can save the week.
            </Text>
          )}
        </Screen>
      )}

      <Sheet visible={addBlockVisible} onClose={() => setAddBlockVisible(false)} maxHeightPct="75%">
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Add block</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {blockChoices.map((choice) => (
            <Pressable
              key={choice.key}
              onPress={() => addBlock(choice)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: choice.color }} />
              <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{choice.displayLabel}</Text>
              <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>

      <Sheet visible={!!pickerBlockId} onClose={() => setPickerBlockId(null)} maxHeightPct="75%">
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Add exercise</Text>
          <TextInput
            value={pickerSearch}
            onChangeText={setPickerSearch}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textFaint}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.text }}
          />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {pickerResults.map((name) => (
            <Pressable
              key={name}
              onPress={() => pickerBlockId && addExercise(pickerBlockId, name)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={{ fontSize: 14, color: colors.text }}>{name}</Text>
            </Pressable>
          ))}
          {pickerSearch.trim() && !pickerResults.some((n) => n.toLowerCase() === pickerSearch.trim().toLowerCase()) && (
            <Pressable
              onPress={() => pickerBlockId && addExercise(pickerBlockId, pickerSearch.trim())}
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 14, color: colors.text, fontStyle: 'italic' }}>Add &quot;{pickerSearch.trim()}&quot; as custom exercise</Text>
            </Pressable>
          )}
        </ScrollView>
      </Sheet>

      <Sheet visible={generateVisible} onClose={() => setGenerateVisible(false)}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            Generate {selectedDay == null ? 'general blocks' : DAY_LABELS[selectedDay - 1]} (week {week}) with AI
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12, lineHeight: 17 }}>
            Builds a full set of blocks for {primaryGroup} at {Math.round((workout?.intensityPct ?? 0.75) * 100)}% intensity,
            using only exercises already in your library. You can edit anything before saving.
            {visibleBlocks.length > 0
              ? ` This replaces the ${visibleBlocks.length} block${visibleBlocks.length === 1 ? '' : 's'} already on ${selectedDay == null ? 'General' : DAY_LABELS[selectedDay - 1]}.`
              : ''}
          </Text>
          <TextField
            label="Focus (optional)"
            value={generateFocus}
            onChangeText={setGenerateFocus}
            placeholder="e.g. deload week, extra plyo emphasis"
          />
          {generateError && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{generateError}</Text>}
          <Button label="Generate" onPress={handleGenerate} loading={generating} />
        </ScrollView>
      </Sheet>
    </View>
  );
}

function pctToText(v: number | null): string {
  return v == null ? '' : String(Math.round(v * 100));
}

function ExerciseFieldsForm({
  exercise,
  fields,
  blockType,
  onChange,
}: {
  exercise: BlockExercise;
  fields: (keyof BlockExercise)[];
  blockType: WorkoutBlock['type'];
  onChange: (patch: Partial<BlockExercise>) => void;
}) {
  const isDuration = blockType === 'warm_up' || blockType === 'cool_down';
  const has = (f: keyof BlockExercise) => fields.includes(f);

  return (
    <View>
      {has('sets') && (
        <TextField
          label="Sets"
          keyboardType="number-pad"
          value={exercise.sets != null ? String(exercise.sets) : ''}
          onChangeText={(t) => onChange({ sets: t ? parseInt(t, 10) : null })}
        />
      )}
      {has('repsPattern') && (
        <TextField
          label="Reps (e.g. 8 or 5,3,5,3,5)"
          value={exercise.repsPattern ?? ''}
          onChangeText={(t) => onChange({ repsPattern: t || null })}
        />
      )}
      {has('pctOfMax') && (
        <TextField
          label="% of max"
          keyboardType="decimal-pad"
          value={pctToText(exercise.pctOfMax)}
          onChangeText={(t) => onChange({ pctOfMax: t ? parseFloat(t) / 100 : null })}
          placeholder="e.g. 75"
        />
      )}
      {has('weightLbs') && (
        <TextField
          label="Fixed weight (lbs, overrides % of max)"
          keyboardType="decimal-pad"
          value={exercise.weightLbs != null ? String(exercise.weightLbs) : ''}
          onChangeText={(t) => onChange({ weightLbs: t ? parseFloat(t) : null })}
        />
      )}
      {has('distanceMetres') && (
        <TextField
          label="Distance (m)"
          keyboardType="decimal-pad"
          value={exercise.distanceMetres != null ? String(exercise.distanceMetres) : ''}
          onChangeText={(t) => onChange({ distanceMetres: t ? parseFloat(t) : null })}
        />
      )}
      {has('intensityPct') && (
        <TextField
          label="Intensity %"
          keyboardType="decimal-pad"
          value={pctToText(exercise.intensityPct)}
          onChangeText={(t) => onChange({ intensityPct: t ? parseFloat(t) / 100 : null })}
          placeholder="e.g. 95"
        />
      )}
      {has('restSeconds') && (
        <TextField
          label="Rest (seconds)"
          keyboardType="number-pad"
          value={exercise.restSeconds != null ? String(exercise.restSeconds) : ''}
          onChangeText={(t) => onChange({ restSeconds: t ? parseInt(t, 10) : null })}
        />
      )}
      {has('timeSeconds') && isDuration && (
        <TextField
          label="Duration (minutes)"
          keyboardType="decimal-pad"
          value={exercise.timeSeconds != null ? String(Math.round(exercise.timeSeconds / 60)) : ''}
          onChangeText={(t) => onChange({ timeSeconds: t ? parseFloat(t) * 60 : null })}
        />
      )}
      {has('timeSeconds') && !isDuration && (
        <TextField
          label="Time (seconds)"
          keyboardType="number-pad"
          value={exercise.timeSeconds != null ? String(exercise.timeSeconds) : ''}
          onChangeText={(t) => onChange({ timeSeconds: t ? parseInt(t, 10) : null })}
        />
      )}
      {has('coachingCue') && (
        <TextField label="Coaching cue" value={exercise.coachingCue ?? ''} onChangeText={(t) => onChange({ coachingCue: t || null })} multiline />
      )}
      {has('notes') && (
        <TextField label="Notes" value={exercise.notes ?? ''} onChangeText={(t) => onChange({ notes: t || null })} multiline />
      )}
    </View>
  );
}
