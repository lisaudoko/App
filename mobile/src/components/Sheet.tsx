import React from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TouchableWithoutFeedback, View, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  maxHeightPct?: ViewStyle['maxHeight'];
  children: React.ReactNode;
}

/**
 * Shared bottom-sheet chrome: modal + dimmed backdrop (tap to close) + sliding
 * card. Keeps the focused field clear of the keyboard, and a tap inside the
 * card but outside any input dismisses the keyboard without closing the sheet.
 */
export function Sheet({ visible, onClose, maxHeightPct = '85%', children }: Props) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Pressable
              onPress={() => {}}
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.surface,
                  maxHeight: maxHeightPct,
                },
              ]}
            >
              {/* Drag handle */}
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              {children}
            </Pressable>
          </TouchableWithoutFeedback>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Upward shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
