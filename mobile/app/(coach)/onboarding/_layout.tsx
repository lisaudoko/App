import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="events" />
      <Stack.Screen name="config" />
      <Stack.Screen name="done" />
    </Stack>
  );
}
