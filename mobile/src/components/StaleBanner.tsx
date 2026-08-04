import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

export function StaleBanner() {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.warningBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
      <Text style={{ fontSize: 11, color: colors.warning, flex: 1 }}>You&apos;re offline — showing the last saved data.</Text>
    </View>
  );
}
