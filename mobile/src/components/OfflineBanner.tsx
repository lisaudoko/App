import React from 'react';
import { Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * Global connectivity banner, mounted once at the root so it's visible over
 * every screen (auth included) — distinct from StaleBanner, which is a
 * per-screen "showing cached data" notice tied to a specific failed fetch.
 */
export function OfflineBanner() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetInfo();

  // Both fields start out null until NetInfo resolves its first reading —
  // treat that as "unknown", not "offline", to avoid a false-positive flash.
  const offline = isConnected === false || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.danger,
        paddingVertical: 7,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={14} color="#FFFFFF" />
      <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '600' }}>No internet connection</Text>
    </View>
  );
}
