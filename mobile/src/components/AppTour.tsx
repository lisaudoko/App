import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTourStore } from '@/store/tourStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

const STOPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'people', title: 'My Squad', body: 'See every athlete at a glance — who has logged, who needs a check-in.' },
  { icon: 'calendar', title: 'Calendar', body: 'Plan and review training sessions across the week.' },
  { icon: 'trophy', title: 'Meets', body: 'Track competition schedules and enter results on meet day.' },
  { icon: 'sparkles', title: 'AI assistant', body: 'Ask about squad trends, risk flags, or a specific athlete.' },
  { icon: 'book', title: 'Notes', body: 'Keep a coaching diary — flag things to follow up on later.' },
];

/**
 * Purely descriptive welcome overlay — a Modal, not a route, so it renders on
 * top of whatever's already mounted underneath (the coach tabs keep loading
 * their own data unaffected). No forced step-through: everything is shown at
 * once and a single tap dismisses it.
 */
export function AppTour() {
  const { colors } = useAppTheme();
  const completed = useTourStore((s) => s.completed);
  const replaying = useTourStore((s) => s.replaying);
  const hasHydrated = useTourStore((s) => s.hasHydrated);
  const dismiss = useTourStore((s) => s.dismiss);

  const visible = hasHydrated && (!completed || replaying);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, translateY]);

  function handleDismiss() {
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      opacity.setValue(0);
      translateY.setValue(16);
      dismiss();
    });
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 }}>
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <Card style={{ marginBottom: 0 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Welcome to TRU Performance</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
              A quick look at what each tab does — come back to this anytime from Settings.
            </Text>
            {STOPS.map((stop) => (
              <View key={stop.title} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={stop.icon} size={16} color={colors.accentText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{stop.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 16 }}>{stop.body}</Text>
                </View>
              </View>
            ))}
            <Button label="Got it" onPress={handleDismiss} />
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}
