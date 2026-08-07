import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import { EVENT_GROUP_EVENTS, EVENT_GROUP_LABEL, type EventGroup } from '@/lib/formatPerformance';
import type { ProgrammeConfig } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EventConfigForm, type EventConfigFormValue } from '@/components/EventConfigForm';

const ALL_GROUPS: EventGroup[] = ['throws', 'sprints', 'jumps'];

export default function ProgrammeConfigScreen() {
  const { colors } = useAppTheme();
  const [config, setConfig] = useState<ProgrammeConfig | null>(null);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    setLoadError(null);
    repository
      .getProgrammeConfig()
      .then((c) => {
        setConfig(c);
        setEventGroups(c?.eventGroups ?? []);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your programme setup'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleGroup(group: EventGroup) {
    setSaved(false);
    setEventGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  async function handleSave(value: EventConfigFormValue) {
    // Unchecking a group hides its card, so the form always reports null for
    // it — preserve whatever was last saved for that group instead of wiping
    // it, so re-enabling the group later restores the old settings.
    const merged: EventConfigFormValue = {
      ...value,
      throws: eventGroups.includes('throws') ? value.throws : (config?.throws ?? null),
      sprints: eventGroups.includes('sprints') ? value.sprints : (config?.sprints ?? null),
      jumps: eventGroups.includes('jumps') ? value.jumps : (config?.jumps ?? null),
    };
    await Promise.all([
      repository.saveProgrammeConfig({ eventGroups, ...merged }),
      repository.updateSeasonStartDate(merged.seasonStartDate || null),
    ]);
    setConfig((prev) => (prev ? { ...prev, eventGroups, ...merged } : { eventGroups, ...merged }));
    setSaved(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Programme setup" onBack={() => router.back()} />
      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <Screen>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Event groups
          </Text>
          <Card style={{ padding: 8, flexDirection: 'row', gap: 8 }}>
            {ALL_GROUPS.map((group) => {
              const active = eventGroups.includes(group);
              return (
                <Pressable
                  key={group}
                  onPress={() => toggleGroup(group)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={EVENT_GROUP_LABEL[group]}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.accentText : colors.textMuted }}>
                    {EVENT_GROUP_LABEL[group]}
                  </Text>
                  <Text style={{ fontSize: 11, marginTop: 2, color: active ? colors.accentText : colors.textFaint, textAlign: 'center' }}>
                    {EVENT_GROUP_EVENTS[group].slice(0, 2).join(', ')}…
                  </Text>
                </Pressable>
              );
            })}
          </Card>
          <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 6 }}>
            Unchecking a group hides it for now — its saved settings aren&apos;t lost, and come back if you re-enable it.
          </Text>

          {eventGroups.length === 0 ? (
            <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 16 }}>
              Select at least one event group to configure its training setup.
            </Text>
          ) : (
            <View style={{ marginTop: 16 }}>
              <EventConfigForm
                key={eventGroups.join(',')}
                eventGroups={eventGroups}
                initial={config}
                onSave={handleSave}
                saveLabel="Save changes"
              />
              {saved && <Text style={{ fontSize: 15, color: colors.success, marginTop: 8, textAlign: 'center' }}>Saved</Text>}
            </View>
          )}
        </Screen>
      )}
    </View>
  );
}
