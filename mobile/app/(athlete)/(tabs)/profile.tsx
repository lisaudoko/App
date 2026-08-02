import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAthleteSelf } from '@/hooks/useAthleteSelf';
import { useAuthStore } from '@/store/authStore';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';

export default function AthleteProfileScreen() {
  const { colors } = useAppTheme();
  const { data, refresh } = useAthleteSelf();
  const session = useAuthStore((s) => s.session);
  const athlete = data.athlete;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Profile"
        rightIcon="settings-outline"
        onRightPress={() => router.push('/(athlete)/settings')}
      />
      <Screen onRefresh={refresh}>
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.accentText }}>
              {session?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 10 }}>{session?.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{athlete?.event ?? '—'}</Text>
        </Card>

        <Card>
          <InfoRow label="Group" value={athlete?.group ?? '—'} />
          <InfoRow label="Status" value={athlete?.status ?? '—'} />
          <InfoRow label="Joined" value={athlete?.joinedAt?.slice(0, 10) ?? '—'} />
          <InfoRow label="Baseline mark" value={athlete ? `${athlete.baselineMark}${athlete.unit}` : '—'} last />
        </Card>

        <Pressable
          onPress={() => router.push('/(athlete)/settings')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 }}
        >
          <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
          <Text style={{ fontSize: 13, color: colors.text }}>Settings</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      </Screen>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' }}>{label}</Text>
      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500', textTransform: 'capitalize' }}>{value}</Text>
    </View>
  );
}
