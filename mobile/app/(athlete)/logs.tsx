import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { repository } from '@/data/repository';
import type { WeeklyLog } from '@/data/types';
import { formatAttemptsSummary, formatPerformance, parseTimeToSeconds, performanceNoun, type PerformanceUnit } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { LoadingState } from '@/components/LoadingState';

export default function MyLogsScreen() {
  const { colors } = useAppTheme();
  const { data, loading, refresh } = useAthleteSelf();
  const athlete = data.athlete;
  const isTimed = athlete?.eventGroup === 'sprints';
  const perfUnit: PerformanceUnit = isTimed ? 'seconds' : 'metres';
  const noun = performanceNoun(perfUnit);

  const [editing, setEditing] = useState<WeeklyLog | null>(null);
  const [markText, setMarkText] = useState('');
  const [rpeText, setRpeText] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function openEdit(log: WeeklyLog) {
    setEditing(log);
    setMarkText(log.mark != null ? String(log.mark) : '');
    setRpeText(log.rpe != null ? String(log.rpe) : '');
    setNotes('');
    setError(null);
    setConfirmDelete(false);
  }

  function close() {
    setEditing(null);
    setConfirmDelete(false);
  }

  async function save() {
    if (!athlete || !editing) return;
    const mark = markText.trim() ? (isTimed ? parseTimeToSeconds(markText) : parseFloat(markText)) : null;
    if (markText.trim() && (mark == null || !Number.isFinite(mark))) {
      setError(`Enter a valid ${noun}.`);
      return;
    }
    const rpe = rpeText.trim() ? parseInt(rpeText, 10) : null;
    if (rpe != null && (Number.isNaN(rpe) || rpe < 1 || rpe > 10)) {
      setError('RPE must be a whole number from 1 to 10.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repository.updateWeeklyLog(athlete.id, editing.week, { mark, rpe, notes: notes.trim() || undefined });
      await refresh();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!athlete || !editing) return;
    setBusy(true);
    setError(null);
    try {
      await repository.deleteWeeklyLog(athlete.id, editing.week);
      await refresh();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this log.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;

  const logs = [...data.logs].sort((a, b) => b.week - a.week);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="My logs" subtitle="Tap a week to fix or delete it" onBack={() => router.back()} />
      <Screen onRefresh={refresh}>
        {logs.length === 0 && (
          <Card>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>Nothing logged yet. Use the Log tab to add your first week.</Text>
          </Card>
        )}
        {logs.map((log) => (
          <Pressable key={log.week} onPress={() => openEdit(log)} accessibilityRole="button" accessibilityLabel={`Edit week ${log.week}`}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Week {log.week}</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                  {log.loggedAt
                    ? new Date(`${log.loggedAt}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
                    : ''}
                </Text>
                {!!log.attempts?.length && (
                  <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 2 }}>
                    {formatAttemptsSummary(log.attempts, perfUnit, athlete?.eventGroup ?? 'throws')}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                {log.mark != null ? formatPerformance(log.mark, perfUnit) : `No ${noun}`}
                {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
              </Text>
              <Ionicons name="create-outline" size={18} color={colors.textFaint} />
            </Card>
          </Pressable>
        ))}
      </Screen>

      <Sheet visible={editing != null} onClose={close}>
        {editing && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Week {editing.week}</Text>
            <TextField
              label={isTimed ? 'Best time (seconds)' : `Best ${noun} (metres)`}
              value={markText}
              onChangeText={setMarkText}
              keyboardType={isTimed ? 'numbers-and-punctuation' : 'decimal-pad'}
              placeholder={isTimed ? 'e.g. 10.82 or 1:48.30' : 'e.g. 16.1'}
            />
            <TextField label="RPE (1–10)" value={rpeText} onChangeText={setRpeText} keyboardType="number-pad" />
            <TextField label="Add or replace note (optional)" value={notes} onChangeText={setNotes} multiline />
            {error && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Button label="Save changes" onPress={save} loading={busy && !confirmDelete} />
            {!confirmDelete ? (
              <Button label="Delete this week" variant="danger" onPress={() => setConfirmDelete(true)} />
            ) : (
              <>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginVertical: 8 }}>
                  This removes the week from your history, progress charts and personal bests. It can&apos;t be undone.
                </Text>
                <Button label="Yes, delete it" variant="danger" onPress={remove} loading={busy} />
                <Button label="Keep it" variant="outline" onPress={() => setConfirmDelete(false)} />
              </>
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}
