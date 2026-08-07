import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

/** A small "?" icon that reveals a plain-language explanation on tap — for acronyms
 *  and domain jargon (RPE, PB, 1RM, etc.) that aren't obvious to a new user. */
export function InfoTip({ term, explanation }: { term: string; explanation: string }) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`What does ${term} mean?`}
      >
        <View
          style={{
            width: 15,
            height: 15,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.textFaint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textFaint, lineHeight: 13 }}>?</Text>
        </View>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 32 }}
          onPress={() => setVisible(false)}
          accessibilityLabel="Dismiss"
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 18, maxWidth: 320, width: '100%' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{term}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 19 }}>{explanation}</Text>
            <Pressable onPress={() => setVisible(false)} style={{ marginTop: 14, alignSelf: 'flex-end' }} accessibilityRole="button" accessibilityLabel="Got it">
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
