import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { EVENT_GROUP_EVENTS, EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import type { JumpsConfig, ProgrammeConfig, SprintsConfig, ThrowsConfig, WorkoutLift } from '@/data/types';
import { Card } from './Card';
import { TextField } from './TextField';
import { Button } from './Button';

const REP_DISTANCE_OPTIONS = [30, 60, 100, 150, 200, 300, 400];
const LIFT_OPTIONS: { value: WorkoutLift; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'bench', label: 'Bench' },
  { value: 'clean', label: 'Clean' },
  { value: 'deadlift', label: 'Deadlift' },
];

function defaultThrows(): ThrowsConfig {
  return { qualifyingEventName: '', strengthLifts: ['squat', 'bench', 'clean', 'deadlift'], calculationMethod: 'percent_1rm' };
}
function defaultSprints(): SprintsConfig {
  return {
    qualifyingEventName: '',
    paceZones: [
      { name: 'Speed', minPct: 95, maxPct: null },
      { name: 'Speed Endurance', minPct: 85, maxPct: 94 },
      { name: 'Tempo', minPct: 70, maxPct: 84 },
      { name: 'Recovery', minPct: 0, maxPct: 69 },
    ],
    repDistances: [60, 100, 200],
    restUnit: 'seconds',
  };
}
function defaultJumps(): JumpsConfig {
  return { qualifyingEventName: '', trackApproachRuns: true, trackPlyoLoad: true, strengthLifts: ['squat', 'bench', 'clean', 'deadlift'] };
}

export interface EventConfigFormValue {
  throws: ThrowsConfig | null;
  sprints: SprintsConfig | null;
  jumps: JumpsConfig | null;
  qualifyingStandards: Record<string, number>;
  competitionDate: string;
}

interface Props {
  eventGroups: EventGroup[];
  initial: ProgrammeConfig | null;
  onSave: (value: EventConfigFormValue) => Promise<void>;
  saveLabel?: string;
}

export function EventConfigForm({ eventGroups, initial, onSave, saveLabel = 'Save' }: Props) {
  const { colors } = useAppTheme();
  const [throwsConfig, setThrowsConfig] = useState<ThrowsConfig>(initial?.throws ?? defaultThrows());
  const [sprintsConfig, setSprintsConfig] = useState<SprintsConfig>(initial?.sprints ?? defaultSprints());
  const [jumpsConfig, setJumpsConfig] = useState<JumpsConfig>(initial?.jumps ?? defaultJumps());
  const [standards, setStandards] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial?.qualifyingStandards ?? {})) out[k] = String(v);
    return out;
  });
  const [competitionDate, setCompetitionDate] = useState(initial?.competitionDate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLift(current: WorkoutLift[], lift: WorkoutLift): WorkoutLift[] {
    return current.includes(lift) ? current.filter((l) => l !== lift) : [...current, lift];
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const qualifyingStandards: Record<string, number> = {};
      for (const [k, v] of Object.entries(standards)) {
        const n = parseFloat(v);
        if (!Number.isNaN(n)) qualifyingStandards[k] = n;
      }
      await onSave({
        throws: eventGroups.includes('throws') ? throwsConfig : null,
        sprints: eventGroups.includes('sprints') ? sprintsConfig : null,
        jumps: eventGroups.includes('jumps') ? jumpsConfig : null,
        qualifyingStandards,
        competitionDate: competitionDate || null as unknown as string,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save configuration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      {eventGroups.includes('throws') && (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Throws</Text>
          <TextField
            label="Qualifying event name"
            value={throwsConfig.qualifyingEventName}
            onChangeText={(t) => setThrowsConfig((c) => ({ ...c, qualifyingEventName: t }))}
            placeholder="e.g. ISSA Champs Throws Qualifier"
          />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>Qualifying standards (m)</Text>
          {EVENT_GROUP_EVENTS.throws.map((event) => (
            <TextField
              key={event}
              label={event}
              keyboardType="decimal-pad"
              value={standards[event] ?? ''}
              onChangeText={(t) => setStandards((s) => ({ ...s, [event]: t }))}
            />
          ))}
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: 4 }}>Strength lifts to track</Text>
          <ChipRow
            options={LIFT_OPTIONS}
            selected={throwsConfig.strengthLifts}
            onToggle={(v) => setThrowsConfig((c) => ({ ...c, strengthLifts: toggleLift(c.strengthLifts, v) }))}
          />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: 10 }}>Calculation method</Text>
          <SegmentedRow
            options={[
              { value: 'percent_1rm', label: '% of 1RM' },
              { value: 'rpe_based', label: 'RPE-based' },
              { value: 'manual', label: 'Manual' },
            ]}
            value={throwsConfig.calculationMethod}
            onChange={(v) => setThrowsConfig((c) => ({ ...c, calculationMethod: v as ThrowsConfig['calculationMethod'] }))}
          />
        </Card>
      )}

      {eventGroups.includes('sprints') && (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Sprints</Text>
          <TextField
            label="Qualifying event name"
            value={sprintsConfig.qualifyingEventName}
            onChangeText={(t) => setSprintsConfig((c) => ({ ...c, qualifyingEventName: t }))}
            placeholder="e.g. ISSA Champs Sprints Qualifier"
          />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>Qualifying standards (seconds)</Text>
          {EVENT_GROUP_EVENTS.sprints.map((event) => (
            <TextField
              key={event}
              label={event}
              keyboardType="decimal-pad"
              value={standards[event] ?? ''}
              onChangeText={(t) => setStandards((s) => ({ ...s, [event]: t }))}
            />
          ))}

          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: 4 }}>Pace zones</Text>
          {sprintsConfig.paceZones.map((zone, i) => (
            <View key={zone.name} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flex: 1.2 }}>
                <TextField
                  value={zone.name}
                  onChangeText={(t) =>
                    setSprintsConfig((c) => ({
                      ...c,
                      paceZones: c.paceZones.map((z, idx) => (idx === i ? { ...z, name: t } : z)),
                    }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="number-pad"
                  value={String(zone.minPct)}
                  onChangeText={(t) =>
                    setSprintsConfig((c) => ({
                      ...c,
                      paceZones: c.paceZones.map((z, idx) => (idx === i ? { ...z, minPct: parseInt(t, 10) || 0 } : z)),
                    }))
                  }
                  placeholder="min %"
                />
              </View>
              <Text style={{ fontSize: 13, color: colors.textFaint }}>–</Text>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="number-pad"
                  value={zone.maxPct != null ? String(zone.maxPct) : ''}
                  onChangeText={(t) =>
                    setSprintsConfig((c) => ({
                      ...c,
                      paceZones: c.paceZones.map((z, idx) => (idx === i ? { ...z, maxPct: t ? parseInt(t, 10) : null } : z)),
                    }))
                  }
                  placeholder="max % (blank = no cap)"
                />
              </View>
            </View>
          ))}

          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: 4 }}>Common rep distances</Text>
          <ChipRow
            options={REP_DISTANCE_OPTIONS.map((d) => ({ value: d, label: `${d}m` }))}
            selected={sprintsConfig.repDistances}
            onToggle={(v) =>
              setSprintsConfig((c) => ({
                ...c,
                repDistances: c.repDistances.includes(v) ? c.repDistances.filter((d) => d !== v) : [...c.repDistances, v].sort((a, b) => a - b),
              }))
            }
          />

          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: 10 }}>Rest unit</Text>
          <SegmentedRow
            options={[
              { value: 'seconds', label: 'Seconds' },
              { value: 'minutes', label: 'Minutes' },
            ]}
            value={sprintsConfig.restUnit}
            onChange={(v) => setSprintsConfig((c) => ({ ...c, restUnit: v as SprintsConfig['restUnit'] }))}
          />
        </Card>
      )}

      {eventGroups.includes('jumps') && (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Jumps</Text>
          <TextField
            label="Qualifying event name"
            value={jumpsConfig.qualifyingEventName}
            onChangeText={(t) => setJumpsConfig((c) => ({ ...c, qualifyingEventName: t }))}
            placeholder="e.g. ISSA Champs Jumps Qualifier"
          />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>Qualifying standards (m)</Text>
          {EVENT_GROUP_EVENTS.jumps.map((event) => (
            <TextField
              key={event}
              label={event}
              keyboardType="decimal-pad"
              value={standards[event] ?? ''}
              onChangeText={(t) => setStandards((s) => ({ ...s, [event]: t }))}
            />
          ))}

          <ToggleRow
            label="Track approach runs"
            value={jumpsConfig.trackApproachRuns}
            onChange={(v) => setJumpsConfig((c) => ({ ...c, trackApproachRuns: v }))}
          />
          <ToggleRow
            label="Track plyometric load"
            value={jumpsConfig.trackPlyoLoad}
            onChange={(v) => setJumpsConfig((c) => ({ ...c, trackPlyoLoad: v }))}
          />

          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: 10 }}>Strength lifts to track</Text>
          <ChipRow
            options={LIFT_OPTIONS}
            selected={jumpsConfig.strengthLifts}
            onToggle={(v) => setJumpsConfig((c) => ({ ...c, strengthLifts: toggleLift(c.strengthLifts, v) }))}
          />
        </Card>
      )}

      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Competition</Text>
        <TextField
          label="Competition date (YYYY-MM-DD)"
          value={competitionDate}
          onChangeText={setCompetitionDate}
          placeholder="2026-04-11"
          keyboardType="numbers-and-punctuation"
        />
      </Card>

      {error && <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 8 }}>{error}</Text>}
      <Button label={saveLabel} onPress={handleSave} loading={saving} />
    </View>
  );
}

function ChipRow<T extends string | number>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onToggle(opt.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={opt.label}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: active ? colors.accent : 'transparent',
              borderWidth: active ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: active ? colors.accentText : colors.textMuted }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SegmentedRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={opt.label}
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
            <Text style={{ fontSize: 13, color: active ? colors.accentText : colors.textMuted }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ fontSize: 15, color: colors.text }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={colors.surface} />
    </View>
  );
}

export { EVENT_GROUP_LABEL };
