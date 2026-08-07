import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';

export default function AthleteTabsLayout() {
  const { colors } = useAppTheme();
  const mustChangePassword = useAuthStore((s) => s.session?.mustChangePassword ?? false);

  // Coach-created athlete accounts start with a coach-chosen password — force a change
  // before letting them into the tabs at all, same Redirect-gating style the coach layout
  // already uses for onboarding/paywall.
  if (mustChangePassword) return <Redirect href="/change-password" />;

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
        options={{ title: 'Workout', tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="strength"
        options={{ title: 'Strength', tabBarIcon: ({ color, size }) => <Ionicons name="fitness" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="logger"
        options={{ title: 'Log', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
