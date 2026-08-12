import React, { useEffect } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTourStore } from '@/store/tourStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

const STOPS: { key: string; route: string; icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { key: 'index', route: '/(coach)/(tabs)', icon: 'people', title: 'My Squad', body: 'See every athlete at a glance — who has logged, who needs a check-in.' },
  { key: 'calendar', route: '/(coach)/(tabs)/calendar', icon: 'calendar', title: 'Calendar', body: 'Plan and review training sessions across the week — tap a day, then + to build it out.' },
  { key: 'meets', route: '/(coach)/(tabs)/meets', icon: 'trophy', title: 'Meets', body: 'Track competition schedules and enter results on meet day.' },
  { key: 'ai', route: '/(coach)/(tabs)/ai', icon: 'sparkles', title: 'AI assistant', body: 'Ask about squad trends, risk flags, or a specific athlete.' },
  { key: 'notes', route: '/(coach)/(tabs)/notes', icon: 'book', title: 'Notes', body: 'Keep a coaching diary — flag things to follow up on later.' },
  { key: 'settings', route: '/(coach)/(tabs)/settings', icon: 'settings', title: 'Settings', body: 'Manage your programme and squad — and you can replay this tour any time from here.' },
];

/**
 * Step-through walkthrough: each step actually switches to the real coach tab
 * (router.navigate) and cuts a spotlight hole out of a dimming overlay around
 * that tab's real bar button (position reported by TourMeasuredButton),
 * with an explanatory card anchored just above it. Manual Next/Back — no
 * autoplay. Renders as a Modal so it sits on top of the tabs underneath,
 * which keep loading/rendering their own data unaffected.
 */
export function AppTour() {
  const { colors } = useAppTheme();
  const active = useTourStore((s) => s.active);
  const hasHydrated = useTourStore((s) => s.hasHydrated);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const tabLayouts = useTourStore((s) => s.tabLayouts);
  const goNext = useTourStore((s) => s.next);
  const goBack = useTourStore((s) => s.back);
  const finish = useTourStore((s) => s.finish);

  const visible = hasHydrated && active;
  const step = STOPS[stepIndex];

  useEffect(() => {
    if (!visible || !step) return;
    router.navigate(step.route as never);
  }, [visible, step]);

  if (!visible || !step) return null;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const cutout = tabLayouts[step.key];
  const isLast = stepIndex === STOPS.length - 1;

  function handleNext() {
    if (isLast) finish();
    else goNext();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish}>
      <View style={{ flex: 1 }}>
        <Svg width={screenWidth} height={screenHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <Mask id="tourMask" x={0} y={0} width={screenWidth} height={screenHeight}>
              <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="#fff" />
              {cutout && (
                <Rect x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} rx={14} ry={14} fill="#000" />
              )}
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill={colors.overlay} mask="url(#tourMask)" />
        </Svg>

        <Pressable accessibilityRole="button" accessibilityLabel="Skip tour" onPress={finish} hitSlop={10} style={{ position: 'absolute', top: 56, right: 20, padding: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Skip</Text>
        </Pressable>

        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            // Anchored just above the spotlighted tab bar button; falls back to a
            // fixed offset for the one frame before its layout has been measured.
            bottom: cutout ? screenHeight - cutout.y + 14 : 100,
          }}
        >
          <Card style={{ marginBottom: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={step.icon} size={14} color={colors.accentText} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{step.title}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 17, marginBottom: 14 }}>{step.body}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
              {STOPS.map((s, i) => (
                <View
                  key={s.key}
                  style={{
                    width: i === stepIndex ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === stepIndex ? colors.accent : colors.border,
                  }}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {stepIndex > 0 && (
                <View style={{ flex: 1 }}>
                  <Button label="Back" variant="outline" onPress={goBack} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button label={isLast ? 'Done' : 'Next'} onPress={handleNext} />
              </View>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}
