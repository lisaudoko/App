import { useLocalSearchParams } from 'expo-router';
import { WorkoutPlansScreen } from '@/screens/WorkoutPlansScreen';

export default function WorkoutsTab() {
  const { week, day } = useLocalSearchParams<{ week?: string; day?: string }>();
  return (
    <WorkoutPlansScreen
      // The tab bar keeps this screen mounted once visited, so its internal week/day
      // state (set via useState's one-time initializer) would otherwise never react to
      // a second Calendar → Workouts jump with different params — this forces a fresh
      // instance (and fresh initial state) whenever the incoming week/day actually change.
      key={`${week ?? 'latest'}-${day ?? 'none'}`}
      initialWeek={week ? Number(week) : undefined}
      initialDay={day === undefined ? undefined : day === 'null' ? null : Number(day)}
    />
  );
}
