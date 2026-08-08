import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { repository } from '@/data/repository';
import { ATHLETE_STATUS_LABEL, type Athlete } from '@/data/types';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';

export default function ManageSquadScreen() {
  const { colors } = useAppTheme();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    repository
      .getFullContext()
      .then((ctx) => setAthletes(ctx.athletes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRemove(athleteId: string) {
    if (confirmId !== athleteId) {
      setConfirmId(athleteId);
      setError(null);
      setTimeout(() => setConfirmId((cur) => (cur === athleteId ? null : cur)), 3000);
      return;
    }
    setRemovingId(athleteId);
    setError(null);
    try {
      await repository.removeAthlete(athleteId);
      setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
      setConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that athlete');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Manage squad" subtitle={`${athletes.length} athlete${athletes.length === 1 ? '' : 's'}`} onBack={() => router.back()} />
      {loading ? (
        <LoadingState />
      ) : (
        <Screen onRefresh={async () => load()}>
          {error && <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text>}
          {athletes.length === 0 && (
            <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No athletes yet.</Text>
          )}
          {athletes.map((athlete) => {
            const confirming = confirmId === athlete.id;
            return (
              <Card key={athlete.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>{athlete.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    {athlete.event || 'No event set'} · {ATHLETE_STATUS_LABEL[athlete.status]}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleRemove(athlete.id)}
                  disabled={removingId === athlete.id}
                  accessibilityRole="button"
                  accessibilityLabel={confirming ? `Confirm remove ${athlete.name}` : `Remove ${athlete.name}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor: confirming ? colors.danger : 'transparent',
                    borderWidth: confirming ? 0 : 1,
                    borderColor: colors.danger,
                    opacity: removingId === athlete.id ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color={confirming ? colors.accentText : colors.danger} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: confirming ? colors.accentText : colors.danger }}>
                    {confirming ? 'Confirm' : 'Remove'}
                  </Text>
                </Pressable>
              </Card>
            );
          })}
        </Screen>
      )}
    </View>
  );
}
