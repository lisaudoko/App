import { router } from 'expo-router';
import { WorkoutPlansScreen } from '@/screens/WorkoutPlansScreen';

export default function WorkoutsScreen() {
  return <WorkoutPlansScreen onBack={() => router.back()} />;
}
