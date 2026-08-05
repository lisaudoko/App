import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { repository } from '@/data/repository';
import type { Meet, MeetEntry } from '@/data/types';
import { EVENT_GROUP_DIRECTION, formatPerformance, type PerformanceUnit } from '@/lib/formatPerformance';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { InlineNoteField } from '@/components/InlineNoteField';

export default function MeetSummaryScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: squad, loading: squadLoading } = useProgrammeData();

  const [meet, setMeet] = useState<Meet | null>(null);
  const [entries, setEntries] = useState<MeetEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const athletesById = useMemo(() => new Map(squad.athletes.map((a) => [a.id, a])), [squad.athletes]);

  function handleNotesChange(text: string) {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (!meet) return;
      repository
        .updateMeet(meet.id, {
          name: meet.name,
          date: meet.date,
          standards: meet.standards,
          location: meet.location,
          meetType: meet.meetType,
          conditions: meet.conditions,
          generalNotes: text,
        })
        .catch(() => {});
    }, 800);
  }

  async function handleShare() {
    if (!meet) return;
    const lines = [`${meet.name} — ${meet.date}`, meet.location ? meet.location : null, ''].filter((l): l is string => l != null);

    for (const entry of entries) {
      const athlete = athletesById.get(entry.athleteId);
      const eventGroup = athlete?.eventGroup ?? 'throws';
      const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';
      const direction = EVENT_GROUP_DIRECTION[eventGroup];
      const sb = athlete && athlete.personalBest > 0 ? athlete.personalBest : null;
      const vsSb =
        entry.finalMark != null && sb != null
          ? direction === 'higher_better'
            ? entry.finalMark - sb
            : sb - entry.finalMark
          : null;
      const parts = [
        athlete?.name ?? 'Unknown',
        entry.event,
        entry.finalMark != null ? formatPerformance(entry.finalMark, unit) : 'No mark',
        entry.place != null ? `${entry.place} place` : null,
        vsSb != null ? `${vsSb >= 0 ? '+' : ''}${vsSb.toFixed(2)}${unit === 'seconds' ? 's' : 'm'} vs SB` : null,
        entry.qualified ? 'QUALIFIED ✓' : null,
      ].filter(Boolean);
      lines.push(parts.join(' — '));
    }

    if (notes.trim()) {
      lines.push('', 'Notes:', notes.trim());
    }

    await Clipboard.setStringAsync(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || squadLoading) return <LoadingState />;
  if (!meet) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Summary" onBack={() => router.back()} />
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>This meet couldn&apos;t be found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={`${meet.name} — Summary`} subtitle={meet.date} onBack={() => router.back()} />
      <Screen>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '700', color: colors.textMuted }}>Athlete</Text>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted }}>Mark</Text>
            <Text style={{ width: 40, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>Place</Text>
            <Text style={{ width: 40, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>Q</Text>
          </View>
          {entries.map((entry, i) => {
            const athlete = athletesById.get(entry.athleteId);
            const eventGroup = athlete?.eventGroup ?? 'throws';
            const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';
            const direction = EVENT_GROUP_DIRECTION[eventGroup];
            const sb = athlete && athlete.personalBest > 0 ? athlete.personalBest : null;
            const vsSb =
              entry.finalMark != null && sb != null
                ? direction === 'higher_better'
                  ? entry.finalMark - sb
                  : sb - entry.finalMark
                : null;
            return (
              <View
                key={entry.id}
                style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border, alignItems: 'center' }}
              >
                <View style={{ flex: 1.4 }}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{athlete?.name ?? 'Unknown'}</Text>
                  <Text style={{ fontSize: 10, color: colors.textFaint }}>{entry.event}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{entry.finalMark != null ? formatPerformance(entry.finalMark, unit) : '—'}</Text>
                  {vsSb != null && (
                    <Text style={{ fontSize: 10, color: vsSb >= 0 ? colors.success : colors.textFaint }}>
                      {vsSb >= 0 ? '+' : ''}
                      {vsSb.toFixed(2)}
                      {unit === 'seconds' ? 's' : 'm'} vs SB
                    </Text>
                  )}
                </View>
                <Text style={{ width: 40, fontSize: 13, color: colors.text, textAlign: 'center' }}>{entry.place ?? '—'}</Text>
                <Text style={{ width: 40, fontSize: 13, textAlign: 'center' }}>{entry.qualified ? '✓' : '—'}</Text>
              </View>
            );
          })}
          {entries.length === 0 && (
            <Text style={{ fontSize: 13, color: colors.textMuted, padding: 12 }}>No athletes were entered in this meet.</Text>
          )}
        </Card>

        <Card>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Notes</Text>
          <InlineNoteField value={notes} onChangeText={handleNotesChange} multiline minHeight={60} />
        </Card>

        <Button label={copied ? 'Copied!' : 'Share summary'} onPress={handleShare} />
      </Screen>
    </View>
  );
}
