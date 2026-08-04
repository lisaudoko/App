import { Stack } from 'expo-router';

export default function CoachLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="athlete/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="athlete/[id]/edit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/config" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="add-athlete" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="workouts" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="meets" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
    </Stack>
  );
}
