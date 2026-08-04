import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useCoachAccess } from '@/hooks/useCoachAccess';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { LoadingState } from '@/components/LoadingState';

export default function CoachTabsLayout() {
  const { colors } = useAppTheme();
  const { access, loading: accessLoading } = useCoachAccess();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();

  if (accessLoading || onboardingLoading) return <LoadingState />;
  if (!access.hasAccess) return <Redirect href="/(coach)/paywall" />;
  if (needsOnboarding) return <Redirect href="/(coach)/onboarding/events" />;

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
        name="heatmap"
        options={{ title: 'Heatmap', tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }}
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
    </Tabs>
  );
}
