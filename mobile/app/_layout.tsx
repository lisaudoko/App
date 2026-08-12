import 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from 'expo-router/react-navigation';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { initRevenueCat } from '@/lib/revenuecat';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';

SplashScreen.preventAutoHideAsync().catch(() => {});
initRevenueCat();

// Android requires a notification channel before any notification can be
// shown with custom importance/vibration/light-color — a no-op on iOS.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'TRU Performance',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0FE68A',
  }).catch(() => {});
}

function RootNavigation() {
  const { resolvedScheme, colors } = useAppTheme();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hasHydrated]);

  // Tapping a push notification routes straight to the relevant athlete —
  // the coach's own athlete detail screen, or the athlete's own progress tab.
  function routeFromNotification(data: Record<string, unknown> | undefined) {
    const role = useAuthStore.getState().session?.role;

    // "You've been added to a meet" — every other payload shape has no `kind` field at all,
    // so this never intercepts the existing athleteId-based routing below.
    if (data?.kind === 'meet_added') {
      if (role === 'athlete') router.push('/(athlete)/(tabs)/calendar');
      return;
    }

    const athleteId = data?.athleteId;
    if (typeof athleteId !== 'string') return;
    if (role === 'coach') router.push(`/(coach)/athlete/${athleteId}`);
    else if (role === 'athlete') router.push('/(athlete)/(tabs)/progress');
  }

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotification(response.notification.request.content.data as Record<string, unknown> | undefined);
    });
    // The listener above only fires while JS is already running — a tap that cold-starts the
    // app from fully killed delivers its response here instead, once hydration/routing settles.
    // Not implemented on web: https://docs.expo.dev/versions/latest/sdk/notifications/#web-support
    if (hasHydrated && Platform.OS !== 'web') {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) routeFromNotification(response.notification.request.content.data as Record<string, unknown> | undefined);
      });
    }
    return () => sub.remove();
  }, [hasHydrated]);

  // Session expiring/being revoked mid-use (token refresh failure, revoked
  // elsewhere, etc.) previously left the user stranded on stale cached
  // screens with repository calls failing silently — this actively sends
  // them back to login the moment `session` transitions to null after
  // having been set (the initial pre-hydration `null` doesn't count).
  const wasAuthedRef = useRef(false);
  useEffect(() => {
    wasAuthedRef.current = !!useAuthStore.getState().session;
    const unsub = useAuthStore.subscribe((state) => {
      const isAuthed = !!state.session;
      if (wasAuthedRef.current && !isAuthed) router.replace('/login');
      wasAuthedRef.current = isAuthed;
    });
    return unsub;
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
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="(athlete)" />
      </Stack>
      <OfflineBanner />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <ErrorBoundary>
            <RootNavigation />
          </ErrorBoundary>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
