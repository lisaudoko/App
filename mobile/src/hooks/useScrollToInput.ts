import { useRef } from 'react';
import { findNodeHandle, UIManager, type ScrollView, type TextInput } from 'react-native';

/**
 * Manual scroll-to-focused-input for long forms inside a `Screen`. Android has no reliable
 * native "bring focused field above the keyboard" behavior under edge-to-edge (see Screen.tsx's
 * own KeyboardAvoidingView notes) — a field a few rows down a long form can end up hidden behind
 * the keyboard with nothing to auto-scroll it into view. Wire `scrollRef` to `<Screen scrollRef=…>`
 * and call `scrollToInput(fieldRef)` from that field's `onFocus`.
 */
export function useScrollToInput() {
  const scrollRef = useRef<ScrollView>(null);

  function scrollToInput(inputRef: React.RefObject<TextInput | null>) {
    const input = inputRef.current;
    const scroller = scrollRef.current;
    if (!input || !scroller) return;
    const inputHandle = findNodeHandle(input);
    const scrollerHandle = findNodeHandle(scroller);
    if (!inputHandle || !scrollerHandle) return;
    UIManager.measureLayout(
      inputHandle,
      scrollerHandle,
      () => {},
      (_left, top) => {
        scroller.scrollTo({ y: Math.max(0, top - 24), animated: true });
      },
    );
  }

  return { scrollRef, scrollToInput };
}
