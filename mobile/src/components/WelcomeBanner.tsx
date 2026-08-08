import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

export function WelcomeBanner({ text }: { text: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.successBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
      }}
    >
      <Ionicons name="sunny-outline" size={14} color={colors.success} />
      <Text style={{ fontSize: 13, color: colors.success, flex: 1 }}>{text}</Text>
    </View>
  );
}
