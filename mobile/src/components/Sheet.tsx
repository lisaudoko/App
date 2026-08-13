import React from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TouchableWithoutFeedback, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Android intentionally stays `undefined` here, NOT "height" — KeyboardAvoidingView's
          "height" behavior nested inside a Modal has a known bug on some Android/RN versions
          where it collapses its content to zero height (renders as a blank/black sheet) before
          any keyboard event fires. Modal's own Dialog window still hardcodes adjustResize,
          which is what Android falls back to here. See Screen.tsx for the non-Modal case,
          where "height" is safe and still used. */}
      {/* "height" behavior inside a Modal on Android can collapse content to zero
          height, so Android intentionally stays undefined (adjustResize handles it). */}
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
                  // Content inside supplies its own top/side padding — this only keeps the
                  // card's bottom edge (buttons, list items) clear of the system nav bar.
                  paddingBottom: insets.bottom,
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
    // A sheet's content that runs taller than maxHeight must scroll, not spill past this
    // box — without clipping, overflow renders past the card's own background and can land
    // behind the system nav bar (looks identical to "covered by the nav bar" but isn't fixable
    // with bottom padding since it's the content, not the card edge, that's out of bounds).
    overflow: 'hidden',
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
