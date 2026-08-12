import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { repository } from '@/data/repository';
import type { Meet, MeetEntry } from '@/data/types';
import { formatPerformance, inferEventGroup, type PerformanceUnit } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { InlineNoteField } from '@/components/InlineNoteField';
import { Sheet } from '@/components/Sheet';
import { MEET_TYPE_LABEL } from '@/screens/MeetsScreen';

export default function MeetDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: squad, loading: squadLoading } = useProgrammeData();

  const [meet, setMeet] = useState<Meet | null>(null);
  const [entries, setEntries] = useState<MeetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerAthleteId, setPickerAthleteId] = useState<string | null>(null);
  const [entryEvent, setEntryEvent] = useState('');
  const [entrySeedMark, setEntrySeedMark] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [completingBusy, setCompletingBusy] = useState(false);

  const [standardsVisible, setStandardsVisible] = useState(false);
  const [newStandardEvent, setNewStandardEvent] = useState('');
  const [newStandardValue, setNewStandardValue] = useState('');
  const [standardsBusy, setStandardsBusy] = useState(false);
  const [standardsError, setStandardsError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([repository.getMeet(id), repository.getMeetEntries(id)])
      .then(([m, e]) => {
        setMeet(m);
        setEntries(e);
        setNotes(m?.generalNotes ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleNotesChange(text: string) {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (!meet) return;
      // Only patches generalNotes — sending the whole meet snapshot here raced with
      // saveStandards() below if both fired within the same 800ms window, silently
      // dropping whichever write landed first.
      repository.updateMeet(meet.id, { generalNotes: text }).catch(() => {});
    }, 800);
  }

  const enteredAthleteIds = useMemo(() => new Set(entries.map((e) => e.athleteId)), [entries]);
  const availableAthletes = useMemo(() => squad.athletes.filter((a) => !enteredAthleteIds.has(a.id)), [squad.athletes, enteredAthleteIds]);
  const athletesById = useMemo(() => new Map(squad.athletes.map((a) => [a.id, a])), [squad.athletes]);

  function openPicker() {
    setPickerAthleteId(null);
    setEntryEvent('');
    setEntrySeedMark('');
    setAddError(null);
    setPickerVisible(true);
  }

  function selectAthleteForEntry(athleteId: string) {
    const athlete = athletesById.get(athleteId);
    setPickerAthleteId(athleteId);
    setEntryEvent(athlete?.event ?? '');
    setEntrySeedMark(athlete?.personalBest ? String(athlete.personalBest) : '');
  }

  async function confirmAddEntry() {
    if (!id || !pickerAthleteId || !entryEvent.trim()) return;
    setAddBusy(true);
    setAddError(null);
    try {
      await repository.addMeetEntry({
        meetId: id,
        athleteId: pickerAthleteId,
        event: entryEvent.trim(),
        seedMark: entrySeedMark ? parseFloat(entrySeedMark) : undefined,
      });
      setPickerVisible(false);
      load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add athlete');
    } finally {
      setAddBusy(false);
    }
  }

  async function saveStandards(next: Record<string, number>) {
    if (!meet) return;
    setStandardsBusy(true);
    setStandardsError(null);
    try {
      await repository.updateMeet(meet.id, { standards: next });
      setMeet({ ...meet, standards: next });
    } catch (err) {
      setStandardsError(err instanceof Error ? err.message : 'Could not save standard');
    } finally {
      setStandardsBusy(false);
    }
  }

  async function toggleCompleted() {
    if (!meet) return;
    setCompletingBusy(true);
    try {
      const next = !meet.completed;
      await repository.setMeetCompleted(meet.id, next);
      setMeet({ ...meet, completed: next });
    } catch {
      // Button stays in its current state so the coach can retry.
    } finally {
      setCompletingBusy(false);
    }
  }

  function addStandard() {
    if (!meet || !newStandardEvent.trim() || !newStandardValue.trim()) return;
    const value = parseFloat(newStandardValue);
    if (!Number.isFinite(value)) {
      setStandardsError('Enter a valid number for the standard.');
      return;
    }
    saveStandards({ ...meet.standards, [newStandardEvent.trim()]: value });
    setNewStandardEvent('');
    setNewStandardValue('');
  }

  function removeStandard(event: string) {
    if (!meet) return;
    const next = { ...meet.standards };
    delete next[event];
    saveStandards(next);
  }

  if (loading || squadLoading) return <LoadingState />;
  if (!meet) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Meet" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>This meet couldn&apos;t be found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={meet.name} subtitle={meet.date} onBack={() => router.back()} />
      <Screen>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {meet.completed && <Pill label="Completed" tone="success" />}
          {meet.meetType && <Pill label={MEET_TYPE_LABEL[meet.meetType] ?? meet.meetType} tone="neutral" />}
          {meet.location && <Pill label={meet.location} tone="neutral" />}
          {meet.conditions && <Pill label={meet.conditions} tone="neutral" />}
        </View>

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>General notes</Text>
          <InlineNoteField value={notes} onChangeText={handleNotesChange} multiline minHeight={44} />
        </Card>

        <Pressable onPress={() => setStandardsVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="ribbon-outline" size={18} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Qualifying standards</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                {Object.keys(meet.standards).length > 0
                  ? Object.keys(meet.standards).join(', ')
                  : 'Set the cutoff mark per event for this meet'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Card>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Athletes ({entries.length})</Text>
          <Pressable onPress={openPicker} accessibilityRole="button" accessibilityLabel="Add athlete" hitSlop={8}>
            <Ionicons name="person-add-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {entries.length === 0 && (
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>No athletes entered yet.</Text>
        )}

        {entries.map((entry) => {
          const athlete = athletesById.get(entry.athleteId);
          const eventGroup = inferEventGroup(entry.event) ?? athlete?.eventGroup ?? 'throws';
          const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';
          return (
            <Pressable key={entry.id} onPress={() => id && router.push(`/(coach)/meets/${id}/athlete/${entry.athleteId}`)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>{athlete?.name ?? 'Unknown athlete'}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    {entry.event} · {entry.finalMark != null ? formatPerformance(entry.finalMark, unit) : 'No mark yet'}
                    {entry.place != null ? ` · ${entry.place}${placeSuffix(entry.place)}` : ''}
                  </Text>
                </View>
                {entry.qualified && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Card>
            </Pressable>
          );
        })}

        <Button
          label={meet.completed ? 'Reopen meet' : 'Mark as completed'}
          variant={meet.completed ? 'outline' : 'primary'}
          onPress={toggleCompleted}
          loading={completingBusy}
        />
        <Button label="View summary" variant="outline" onPress={() => id && router.push(`/(coach)/meets/${id}/summary`)} />
      </Screen>

      <Sheet visible={pickerVisible} onClose={() => setPickerVisible(false)} maxHeightPct="80%">
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            {pickerAthleteId ? 'Entry details' : 'Add athlete'}
          </Text>
        </View>
        {!pickerAthleteId ? (
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {availableAthletes.length === 0 && (
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Everyone in your squad is already entered.</Text>
            )}
            {availableAthletes.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => selectAthleteForEntry(a.id)}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontSize: 15, color: colors.text }}>{a.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{a.event}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <TextField label="Event" value={entryEvent} onChangeText={setEntryEvent} placeholder="e.g. Shot Put" />
            <TextField label="Seed mark (optional)" value={entrySeedMark} onChangeText={setEntrySeedMark} keyboardType="decimal-pad" />
            {addError && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{addError}</Text>}
            <Button label="Add to meet" onPress={confirmAddEntry} loading={addBusy} disabled={!entryEvent.trim()} />
            <Button label="Back" variant="outline" onPress={() => setPickerAthleteId(null)} />
          </ScrollView>
        )}
      </Sheet>

      <Sheet visible={standardsVisible} onClose={() => setStandardsVisible(false)} maxHeightPct="80%">
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Qualifying standards</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            One cutoff per event, shared by every athlete entered in it here.
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {Object.entries(meet.standards).length === 0 && (
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>No standards set for this meet yet.</Text>
          )}
          {Object.entries(meet.standards).map(([event, value]) => {
            const unit: PerformanceUnit = inferEventGroup(event) === 'sprints' ? 'seconds' : 'metres';
            return (
              <View
                key={event}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: colors.text }}>{event}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{formatPerformance(value, unit)}</Text>
                </View>
                <Pressable onPress={() => removeStandard(event)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${event} standard`}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}

          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 16, marginBottom: 6, fontWeight: '500' }}>Add a standard</Text>
          <TextField label="Event" value={newStandardEvent} onChangeText={setNewStandardEvent} placeholder="e.g. Shot Put" />
          <TextField
            label={`Standard${inferEventGroup(newStandardEvent) === 'sprints' ? ' (seconds)' : ' (metres)'}`}
            value={newStandardValue}
            onChangeText={setNewStandardValue}
            keyboardType="decimal-pad"
            placeholder="e.g. 16.00"
          />
          {standardsError && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{standardsError}</Text>}
          <Button
            label="Add standard"
            onPress={addStandard}
            loading={standardsBusy}
            disabled={!newStandardEvent.trim() || !newStandardValue.trim()}
          />
        </ScrollView>
      </Sheet>
    </View>
  );
}

function placeSuffix(place: number): string {
  if (place % 100 >= 11 && place % 100 <= 13) return 'th';
  switch (place % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
