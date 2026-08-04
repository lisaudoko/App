import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository, defaultWorkoutTemplate } from '@/data/repository';
import { shareWorkout } from '@/lib/shareWorkout';
import { computeExerciseWeight } from '@/engine/workoutWeight';
import type { BlockExercise, EventGroup, Workout, WorkoutBlock } from '@/data/types';
import { blockChoicesForGroups, blockTypeDef, type BlockTypeDef } from '@/data/workoutBlocks';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

export function WorkoutPlansScreen({ onBack }: { onBack?: () => void } = {}) {
  const { colors } = useAppTheme();
  const [existingWeeks, setExistingWeeks] = useState<number[]>([]);
  const [week, setWeek] = useState(1);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addBlockVisible, setAddBlockVisible] = useState(false);
  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    repository.getProgrammeConfig().then((c) => setEventGroups(c?.eventGroups ?? []));
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

  const blockChoices = useMemo(() => blockChoicesForGroups(eventGroups), [eventGroups]);
  const primaryGroup: EventGroup = eventGroups[0] ?? 'throws';

  function updateBlocks(fn: (blocks: WorkoutBlock[]) => WorkoutBlock[]) {
    setWorkout((w) => (w ? { ...w, blocks: fn(w.blocks) } : w));
  }

  function addBlock(def: BlockTypeDef & { displayLabel: string }) {
    updateBlocks((blocks) => [...blocks, { id: genId(), type: def.type, label: def.displayLabel, order: blocks.length, exercises: [] }]);
    setAddBlockVisible(false);
  }

  function removeBlock(blockId: string) {
    updateBlocks((blocks) => blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i })));
  }

  function moveBlock(blockId: string, dir: -1 | 1) {
    updateBlocks((blocks) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= blocks.length) return blocks;
      const copy = [...blocks];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
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
    shareWorkout(`Week ${workout.weekNumber} plan`, workout, primaryGroup, null);
  }

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 12, marginBottom: 4 }}>
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

          {workout.blocks.map((block, i) => {
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
                  <Pressable onPress={() => moveBlock(block.id, 1)} disabled={i === workout.blocks.length - 1} hitSlop={8} accessibilityRole="button" accessibilityLabel="Move block down">
                    <Ionicons name="chevron-down" size={18} color={textColor} style={{ opacity: i === workout.blocks.length - 1 ? 0.3 : 1 }} />
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

          {workout.blocks.length === 0 && (
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
              No blocks yet — add one to start building this week&apos;s session.
            </Text>
          )}

          <Button label="Add block" onPress={() => setAddBlockVisible(true)} />

          {error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 8, marginBottom: 8 }}>{error}</Text>}
          <Button label="Save week" onPress={handleSave} loading={saving} />
        </Screen>
      )}

      <Modal visible={addBlockVisible} animationType="slide" transparent onRequestClose={() => setAddBlockVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setAddBlockVisible(false)}>
          <View style={{ marginTop: 'auto', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' }}>
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
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!pickerBlockId} animationType="slide" transparent onRequestClose={() => setPickerBlockId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setPickerBlockId(null)}>
          <Pressable style={{ marginTop: 'auto', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' }}>
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
            <ScrollView contentContainerStyle={{ padding: 16 }}>
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
          </Pressable>
        </Pressable>
      </Modal>
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
