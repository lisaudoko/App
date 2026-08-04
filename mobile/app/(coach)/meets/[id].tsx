import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { repository } from '@/data/repository';
import type { Meet, MeetEntry } from '@/data/types';
import { formatPerformance, type PerformanceUnit } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { InlineNoteField } from '@/components/InlineNoteField';

const MEET_TYPE_LABEL: Record<string, string> = {
  qualifier: 'Qualifier',
  championship: 'Championship',
  invitational: 'Invitational',
  dual_meet: 'Dual Meet',
  time_trial: 'Time Trial',
};

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

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([repository.getMeet(id), repository.getMeetEntries(id)])
      .then(([m, e]) => {
        setMeet(m);
        setEntries(e);
        setNotes(m?.generalNotes ?? '');
      })
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
      repository.updateMeet(meet.id, {
        name: meet.name,
        date: meet.date,
        standards: meet.standards,
        location: meet.location,
        meetType: meet.meetType,
        conditions: meet.conditions,
        generalNotes: text,
      }).catch(() => {});
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
          {meet.meetType && <Pill label={MEET_TYPE_LABEL[meet.meetType] ?? meet.meetType} tone="neutral" />}
          {meet.location && <Pill label={meet.location} tone="neutral" />}
          {meet.conditions && <Pill label={meet.conditions} tone="neutral" />}
        </View>

        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>General notes</Text>
          <InlineNoteField value={notes} onChangeText={handleNotesChange} multiline minHeight={44} />
        </Card>

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
          const eventGroup = athlete?.eventGroup ?? 'throws';
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

        <Button label="Mark complete" onPress={() => id && router.push(`/(coach)/meets/${id}/summary`)} />
      </Screen>

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setPickerVisible(false)}>
          <Pressable style={{ marginTop: 'auto', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {pickerAthleteId ? 'Entry details' : 'Add athlete'}
              </Text>
            </View>
            {!pickerAthleteId ? (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
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
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                <TextField label="Event" value={entryEvent} onChangeText={setEntryEvent} placeholder="e.g. Shot Put" />
                <TextField label="Seed mark (optional)" value={entrySeedMark} onChangeText={setEntrySeedMark} keyboardType="decimal-pad" />
                {addError && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{addError}</Text>}
                <Button label="Add to meet" onPress={confirmAddEntry} loading={addBusy} disabled={!entryEvent.trim()} />
                <Button label="Back" variant="outline" onPress={() => setPickerAthleteId(null)} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
