import { useLocalSearchParams } from 'expo-router';
import { WorkoutPlansScreen } from '@/screens/WorkoutPlansScreen';

export default function WorkoutsTab() {
  const { week, day } = useLocalSearchParams<{ week?: string; day?: string }>();
  return (
    <WorkoutPlansScreen
      initialWeek={week ? Number(week) : undefined}
      initialDay={day === undefined ? undefined : day === 'null' ? null : Number(day)}
    />
  );
}
