import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const { resolvedScheme, colors } = useAppTheme();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hasHydrated]);

  // Tapping a push notification routes straight to the relevant athlete —
  // the coach's own athlete detail screen, or the athlete's own progress tab.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const athleteId = response.notification.request.content.data?.athleteId;
      if (typeof athleteId !== 'string') return;
      const role = useAuthStore.getState().session?.role;
      if (role === 'coach') router.push(`/(coach)/athlete/${athleteId}`);
      else if (role === 'athlete') router.push('/(athlete)/(tabs)/progress');
    });
    return () => sub.remove();
  }, []);

  const navTheme = {
    ...(resolvedScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.text,
      text: colors.text,
      border: colors.border,
    },
  };

  if (!hasHydrated) return null;

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="(athlete)" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <RootNavigation />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
