import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const { data, refresh } = useProgrammeData();

  const dotColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.textMuted,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Notifications" onBack={() => router.back()} />
      <Screen onRefresh={refresh}>
        {data.notifications.map((n) => (
          <Pressable key={n.id} onPress={() => n.athleteId && router.push(`/(coach)/athlete/${n.athleteId}`)}>
            <Card style={{ flexDirection: 'row', gap: 9 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, marginTop: 4, backgroundColor: dotColor[n.severity] }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{n.title}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{n.body}</Text>
                <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: 3 }}>{timeAgo(n.createdAt)}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
        {data.notifications.length === 0 && (
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No notifications yet.</Text>
        )}
      </Screen>
    </View>
  );
}
