import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

interface ScreenProps extends ScrollViewProps {
  onRefresh?: () => Promise<void> | void;
  scroll?: boolean;
  padded?: boolean;
}

/**
 * Standard scrollable screen body. Disables iOS rubber-band overscroll and
 * Android's overscroll glow, and wires up pull-to-refresh when `onRefresh`
 * is provided.
 */
export function Screen({ onRefresh, scroll = true, padded = true, style, children, ...props }: ScreenProps) {
  const { colors } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }, padded && styles.padded, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[padded && styles.paddedContent, style]}
      // iOS's pull-to-refresh is implemented as the same elastic overscroll as
      // rubber-banding, so screens with onRefresh must keep bounce enabled or
      // the pull gesture cannot be dragged far enough to trigger it.
      bounces={!!onRefresh}
      alwaysBounceVertical={!!onRefresh}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textMuted} />
        ) : undefined
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 16 },
  paddedContent: { padding: 16, paddingBottom: 32 },
});
