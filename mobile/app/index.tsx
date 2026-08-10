import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const session = useAuthStore((s) => s.session);

  if (!session) return <Redirect href="/login" />;
  if (session.role === 'coach' || session.role === 'assistant_coach') return <Redirect href="/(coach)/(tabs)" />;
  return <Redirect href="/(athlete)/(tabs)" />;
}
