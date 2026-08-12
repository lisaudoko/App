import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { repository } from '@/data/repository';
import type { Athlete, AthleteNote, NoteType } from '@/data/types';
import { EVENT_GROUP_LABEL } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { InlineNoteField } from '@/components/InlineNoteField';
import { Sheet } from '@/components/Sheet';
import { radius, spacing } from '@/theme/spacing';

const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  general: 'General',
  injury: 'Injury',
  technical: 'Technical',
  mindset: 'Mindset',
  admin: 'Admin',
};
const NOTE_TYPES = Object.keys(NOTE_TYPE_LABEL) as NoteType[];

type DateFilter = 'week' | 'month' | 'all';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function withinFilter(dateIso: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const days = filter === 'week' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(dateIso) >= cutoff;
}

interface FormState {
  id: string | null;
  athleteId: string | null;
  noteDate: string;
  noteType: NoteType;
  body: string;
  flagFollowup: boolean;
}

function emptyForm(athleteId: string | null = null): FormState {
  return { id: null, athleteId, noteDate: todayIso(), noteType: 'general', body: '', flagFollowup: false };
}

export function NotesScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ athleteId?: string; new?: string; t?: string }>();
  const { data: squad } = useProgrammeData();

  const [notes, setNotes] = useState<AthleteNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [athleteFilter, setAthleteFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [athleteSearchOpen, setAthleteSearchOpen] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const athletesById = useMemo(() => new Map(squad.athletes.map((a) => [a.id, a])), [squad.athletes]);

  const load = React.useCallback(() => {
    setLoading(true);
    repository
      .getAthleteNotes()
      .then((n) => {
        setNotes(n);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load notes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-linked from Athlete Detail: pre-filter the list and/or open a pre-filled note sheet.
  useEffect(() => {
    if (params.athleteId) setAthleteFilter(params.athleteId);
    if (params.new === '1' && params.athleteId) {
      openNew(params.athleteId);
    }
    // `t` is a cache-busting nonce (see app/(coach)/athlete/[id].tsx's push call) so re-tapping
    // "Add note" for the same athlete twice in a row still re-triggers this effect — without it,
    // identical repeated params meant the second tap silently failed to reopen the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.athleteId, params.new, params.t]);

  const visibleNotes = useMemo(
    () =>
      notes.filter((n) => (athleteFilter ? n.athleteId === athleteFilter : true) && withinFilter(n.noteDate, dateFilter)),
    [notes, athleteFilter, dateFilter],
  );

  function openNew(presetAthleteId: string | null = null) {
    setForm(emptyForm(presetAthleteId ?? athleteFilter));
    setAthleteSearch('');
    setAthleteSearchOpen(false);
    setError(null);
    setConfirmDelete(false);
    setSheetVisible(true);
  }

  function openEdit(note: AthleteNote) {
    setForm({
      id: note.id,
      athleteId: note.athleteId,
      noteDate: note.noteDate,
      noteType: note.noteType,
      body: note.body,
      flagFollowup: note.flagFollowup,
    });
    setAthleteSearch('');
    setAthleteSearchOpen(false);
    setError(null);
    setConfirmDelete(false);
    setSheetVisible(true);
  }

  async function handleSave() {
    if (!form.athleteId || !form.body.trim()) {
      setError('Athlete and a note body are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await repository.updateAthleteNote(form.id, {
          athleteId: form.athleteId,
          noteDate: form.noteDate,
          noteType: form.noteType,
          body: form.body.trim(),
          flagFollowup: form.flagFollowup,
        });
      } else {
        await repository.createAthleteNote({
          athleteId: form.athleteId,
          noteDate: form.noteDate,
          noteType: form.noteType,
          body: form.body.trim(),
          flagFollowup: form.flagFollowup,
        });
      }
      setSheetVisible(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    setSaving(true);
    try {
      await repository.deleteAthleteNote(form.id);
      setSheetVisible(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete note');
    } finally {
      setSaving(false);
    }
  }

  const filteredAthleteOptions = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase();
    const list = squad.athletes;
    return q ? list.filter((a) => a.name.toLowerCase().includes(q)) : list;
  }, [squad.athletes, athleteSearch]);

  const selectedAthlete: Athlete | undefined = form.athleteId ? athletesById.get(form.athleteId) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Notes" subtitle="Coaching diary" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {[null, ...squad.athletes.map((a) => a.id)].map((id) => {
            const active = athleteFilter === id;
            const label = id ? athletesById.get(id)?.name.split(' ')[0] ?? '—' : 'All athletes';
            return (
              <Pressable
                key={id ?? 'all'}
                onPress={() => setAthleteFilter(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.text : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? colors.text : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.background : colors.textMuted }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 10 }}>
        {(['week', 'month', 'all'] as const).map((f) => {
          const active = dateFilter === f;
          const label = f === 'week' ? 'This week' : f === 'month' ? 'This month' : 'All time';
          return (
            <Pressable
              key={f}
              onPress={() => setDateFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.accent : 'transparent',
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: active ? colors.accentText : colors.textMuted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingState />
      ) : loadError && notes.length === 0 ? (
        <ErrorState onRetry={load} message={loadError} />
      ) : (
        <Screen onRefresh={async () => load()}>
          {visibleNotes.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <Ionicons name="document-text-outline" size={32} color={colors.textFaint} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>No notes yet</Text>
              <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                Tap + to jot down a quick observation about an athlete.
              </Text>
            </View>
          )}
          {visibleNotes.map((note) => {
            const athlete = athletesById.get(note.athleteId);
            return (
              <Pressable key={note.id} onPress={() => openEdit(note)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{athlete?.name ?? 'Unknown athlete'}</Text>
                        {athlete?.eventGroup && <Pill label={EVENT_GROUP_LABEL[athlete.eventGroup]} tone="neutral" />}
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {note.noteDate} · {NOTE_TYPE_LABEL[note.noteType]}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }} numberOfLines={2}>
                        {note.body}
                      </Text>
                    </View>
                    {note.flagFollowup && <Text style={{ fontSize: 16 }}>🚩</Text>}
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </Screen>
      )}

      <Pressable
        onPress={() => openNew()}
        accessibilityRole="button"
        accessibilityLabel="New note"
        style={({ pressed }) => [{
          position: 'absolute',
          right: 20,
          bottom: 24 + insets.bottom,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }]}
      >
        <Ionicons name="add" size={26} color={colors.accentText} />
      </Pressable>

      <Sheet visible={sheetVisible} onClose={() => setSheetVisible(false)} maxHeightPct="88%">
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{form.id ? 'Edit note' : 'New note'}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Athlete</Text>
              <Pressable
                onPress={() => setAthleteSearchOpen((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  marginBottom: athleteSearchOpen ? spacing.sm : spacing.md,
                }}
              >
                <Text style={{ fontSize: 15, color: selectedAthlete ? colors.text : colors.textFaint }}>
                  {selectedAthlete?.name ?? 'Select athlete…'}
                </Text>
                <Ionicons name={athleteSearchOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </Pressable>
              {athleteSearchOpen && (
                <View style={{ marginBottom: spacing.md }}>
                  <TextInput
                    value={athleteSearch}
                    onChangeText={setAthleteSearch}
                    placeholder="Search athletes…"
                    placeholderTextColor={colors.textFaint}
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, color: colors.text, marginBottom: 6 }}
                  />
                  <View style={{ maxHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' }}>
                    <ScrollView>
                      {filteredAthleteOptions.map((a) => (
                        <Pressable
                          key={a.id}
                          onPress={() => {
                            setForm((f) => ({ ...f, athleteId: a.id }));
                            setAthleteSearchOpen(false);
                          }}
                          style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
                        >
                          <Text style={{ fontSize: 14, color: colors.text }}>{a.name}</Text>
                        </Pressable>
                      ))}
                      {filteredAthleteOptions.length === 0 && (
                        <Text style={{ fontSize: 13, color: colors.textMuted, padding: 12 }}>No athletes match.</Text>
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}

              <DateField label="Date" value={form.noteDate} onChange={(t) => setForm((f) => ({ ...f, noteDate: t }))} maximumDate={new Date()} />

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                {NOTE_TYPES.map((t) => {
                  const active = form.noteType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setForm((f) => ({ ...f, noteType: t }))}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={NOTE_TYPE_LABEL[t]}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: radius.pill,
                        backgroundColor: active ? colors.accent : 'transparent',
                        borderWidth: active ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: active ? colors.accentText : colors.textMuted }}>{NOTE_TYPE_LABEL[t]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>Note</Text>
              <InlineNoteField
                value={form.body}
                onChangeText={(t) => setForm((f) => ({ ...f, body: t }))}
                placeholder="Tap to add notes…"
                autoFocus={!form.id}
                multiline
                minHeight={90}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.md }}>
                <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>Flag for follow-up</Text>
                <Switch
                  value={form.flagFollowup}
                  onValueChange={(v) => setForm((f) => ({ ...f, flagFollowup: v }))}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.text}
                />
              </View>

          {error && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text>}
          <Button label="Save" onPress={handleSave} loading={saving} />
          {form.id && (
            <Button label={confirmDelete ? 'Tap again to delete' : 'Delete'} variant="danger" onPress={handleDelete} loading={saving} />
          )}
        </ScrollView>
      </Sheet>
    </View>
  );
}

export { NOTE_TYPE_LABEL };
