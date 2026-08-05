import React from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, TouchableWithoutFeedback, type ViewStyle } from 'react-native';
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
              style={{
                marginTop: 'auto',
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: maxHeightPct,
              }}
            >
              {children}
            </Pressable>
          </TouchableWithoutFeedback>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
