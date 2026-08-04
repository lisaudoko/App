import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function AthleteTabsLayout() {
  const { colors } = useAppTheme();

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
