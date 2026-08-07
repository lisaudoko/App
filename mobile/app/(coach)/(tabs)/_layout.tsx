import { useCallback, useRef } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useCoachAccess } from '@/hooks/useCoachAccess';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { LoadingState } from '@/components/LoadingState';

export default function CoachTabsLayout() {
  const { colors } = useAppTheme();
  const { access, loading: accessLoading, refresh: refreshAccess } = useCoachAccess();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();

  // (tabs) and paywall are sibling Stack screens, so navigating to the paywall
  // does not unmount this layout — its useCoachAccess() state would otherwise
  // stay stale after a purchase completes and the coach is sent back here.
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }
      refreshAccess();
    }, [refreshAccess]),
  );

  if (accessLoading || onboardingLoading) return <LoadingState />;
  // Onboarding is checked first: a brand-new coach's trial record is started
  // fire-and-forget at signup (src/store/authStore.ts's onSessionEstablished),
  // so useCoachAccess() can momentarily report hasAccess:false before that
  // write lands. Gating on onboarding-incomplete first (rather than paywall
  // first) means that race can never misroute a new signup to "trial expired."
  if (needsOnboarding) return <Redirect href="/(coach)/onboarding/events" />;
  if (!access.hasAccess) return <Redirect href="/(coach)/paywall" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Squad', tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Workouts', tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="meets"
        options={{ title: 'Meets', tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="ai"
        options={{ title: 'AI', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="notes"
        options={{ title: 'Notes', tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
