import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

interface ScreenProps extends ScrollViewProps {
  onRefresh?: () => Promise<void> | void;
  scroll?: boolean;
  padded?: boolean;
}

/**
 * Standard scrollable screen body. Disables iOS rubber-band overscroll and
 * Android's overscroll glow, wires up pull-to-refresh when `onRefresh` is
 * provided, keeps the focused input clear of the keyboard, and dismisses
 * the keyboard when the user taps anywhere that isn't itself a control.
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.flex, { backgroundColor: colors.background }, padded && styles.padded, style]}>
          {children}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Android's window already resizes around the keyboard (see app.json
      // softwareKeyboardLayoutMode: "resize") — applying height/padding here
      // too would double up the offset.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textMuted} />
            ) : undefined
          }
          {...props}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 16 },
  paddedContent: { padding: 16, paddingBottom: 32 },
});
