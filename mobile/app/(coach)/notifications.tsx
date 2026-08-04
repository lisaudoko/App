import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useProgrammeData } from '@/hooks/useProgrammeData';
import { repository } from '@/data/repository';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';

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
  const { data, loading, refresh } = useProgrammeData();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const dotColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.textMuted,
  };

  function handlePress(id: string, athleteId?: string) {
    setReadIds((prev) => new Set(prev).add(id));
    repository.markNotificationRead(id).catch(() => {});
    if (athleteId) router.push(`/(coach)/athlete/${athleteId}`);
  }

  function markAllRead() {
    const unreadIds = data.notifications.filter((n) => !n.read && !readIds.has(n.id)).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setReadIds((prev) => new Set([...prev, ...unreadIds]));
    Promise.all(unreadIds.map((id) => repository.markNotificationRead(id))).catch(() => {});
  }

  if (loading) return <LoadingState />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Notifications"
        onBack={() => router.back()}
        rightIcon="checkmark-done-outline"
        onRightPress={markAllRead}
        rightLabel="Mark all read"
      />
      <Screen onRefresh={refresh}>
        {data.notifications.map((n) => {
          const unread = !n.read && !readIds.has(n.id);
          return (
            <Pressable key={n.id} onPress={() => handlePress(n.id, n.athleteId)}>
              <Card style={{ flexDirection: 'row', gap: 9, opacity: unread ? 1 : 0.6 }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    marginTop: 4,
                    backgroundColor: unread ? dotColor[n.severity] : colors.border,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: unread ? '700' : '500', color: colors.text }}>{n.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 1 }}>{n.body}</Text>
                  <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 3 }}>{timeAgo(n.createdAt)}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
        {data.notifications.length === 0 && (
          <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No notifications yet.</Text>
        )}
      </Screen>
    </View>
  );
}
