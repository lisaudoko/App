import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';

interface Props {
  message?: string;
  onRetry: () => void;
}

/**
 * Shown when a screen's first data fetch fails with nothing cached to fall
 * back on — distinct from an empty state, since "no data" and "couldn't
 * load data" need different messaging or the failure reads as if the
 * account genuinely has nothing in it.
 */
export function ErrorState({ message = "Couldn't load your data. Check your connection and try again.", onRetry }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textFaint} />
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
        {message}
      </Text>
      <Button label="Try again" onPress={onRetry} />
    </View>
  );
}
