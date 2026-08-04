import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Athlete, AppNotification, Meet, StrengthTest, WeeklyLog, Workout, WorkoutExercise, WorkoutLift } from './types';
import type { Database } from '../../types/supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type WeeklyLogRow = Database['public']['Tables']['weekly_logs']['Row'];
type StrengthLogRow = Database['public']['Tables']['strength_logs']['Row'];
type NotificationRow = Database['public']['Tables']['notifications_log']['Row'];
type WorkoutRow = Database['public']['Tables']['workouts']['Row'];

const VALID_LIFTS: WorkoutLift[] = ['squat', 'clean', 'bench', 'deadlift'];

function toWorkout(row: WorkoutRow): Workout {
  const raw = Array.isArray(row.exercises) ? row.exercises : [];
  const exercises: WorkoutExercise[] = raw.map((e) => {
    const ex = e as Record<string, unknown>;
    const lift = typeof ex.lift === 'string' && (VALID_LIFTS as string[]).includes(ex.lift) ? (ex.lift as WorkoutLift) : null;
    return { name: String(ex.name ?? ''), sets: Number(ex.sets ?? 0), reps: Number(ex.reps ?? 0), lift };
  });
  return { weekNumber: row.week_number, intensityPct: row.intensity_pct ?? 0, exercises };
}

// Competition calendar isn't part of the backend schema (spec has no `meets`
// table) — kept as static reference data for chart annotations.
const STATIC_MEETS: Meet[] = [
  {
    id: 'meet-bg-champs',
    name: 'ISSA Boys & Girls Champs',
    date: '2026-03-27',
    standards: { 'Shot Put': 17.0, Discus: 46.0, Hammer: 55.0, Javelin: 42.0 },
  },
  {
    id: 'meet-carifta',
    name: 'Carifta Games',
    date: '2026-04-11',
    standards: { 'Shot Put': 17.4, Discus: 47.5, Hammer: 57.0, Javelin: 43.5 },
  },
  {
    id: 'meet-world-jnr',
    name: 'World Junior Championships',
    date: '2026-08-02',
    standards: { 'Shot Put': 18.2, Discus: 51.0, Hammer: 62.0, Javelin: 47.0 },
  },
];

const WORKOUT_PROGRESS_KEY = 'tru.workoutProgress.v1';

function toWeeklyLog(row: WeeklyLogRow): WeeklyLog {
  return {
    week: row.week_number,
    label: `W${row.week_number}`,
    mark: row.best_throw,
    rpe: row.rpe,
    // Session-load proxy (RPE × a fixed unit) — the backend schema doesn't
    // track actual training volume, so this is derived purely for charts.
    volumeLoad: row.rpe != null ? row.rpe * 200 : null,
    sleep: row.sleep_score,
    soreness: row.soreness_score,
    energy: row.energy_score,
    isCompetition: false,
    loggedAt: row.week_start,
  };
}

function toStrengthTest(row: StrengthLogRow): StrengthTest {
  return {
    date: row.logged_at,
    label: row.logged_at,
    squat: row.squat_1rm ?? 0,
    clean: row.clean_1rm ?? 0,
    bench: row.bench_1rm ?? 0,
    deadlift: row.deadlift_1rm ?? 0,
  };
}

function toAthlete(profile: ProfileRow, weeklyLogs: WeeklyLog[], strengthTests: StrengthTest[]): Athlete {
  const personalBest = weeklyLogs.reduce((max, l) => (l.mark != null && l.mark > max ? l.mark : max), 0);
  const latest = strengthTests[strengthTests.length - 1];
  const currentMaxes = {
    squat: latest?.squat ?? 0,
    clean: latest?.clean ?? 0,
    bench: latest?.bench ?? 0,
    deadlift: latest?.deadlift ?? 0,
  };
  return {
    id: profile.id,
    userId: profile.id,
    name: profile.full_name,
    event: profile.event ?? '',
    // group/status/target-maxes aren't part of the backend schema; group
    // falls back to event, and target maxes default to +10% over current
    // (a conventional next-block goal) so strength gauges aren't always full.
    group: profile.event ?? '',
    status: 'active',
    unit: 'm',
    baselineMark: profile.baseline_distance ?? 0,
    personalBest,
    currentMaxes,
    targetMaxes: {
      squat: Math.round(currentMaxes.squat * 1.1),
      clean: Math.round(currentMaxes.clean * 1.1),
      bench: Math.round(currentMaxes.bench * 1.1),
      deadlift: Math.round(currentMaxes.deadlift * 1.1),
    },
    qualifyingStandard: profile.qualifying_standard ?? 0,
    joinedAt: profile.created_at,
  };
}

const NOTIFICATION_COPY: Record<NotificationRow['type'], { title: string; severity: AppNotification['severity'] }> = {
  pb: { title: 'New PB', severity: 'success' },
  missing_log: { title: 'Missing log', severity: 'danger' },
  high_rpe: { title: 'High RPE', severity: 'warning' },
  anomaly: { title: 'Anomaly', severity: 'warning' },
  qualifying_risk: { title: 'Qualifying risk', severity: 'warning' },
};

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    title: NOTIFICATION_COPY[row.type].title,
    body: row.message,
    severity: NOTIFICATION_COPY[row.type].severity,
    createdAt: row.sent_at,
    read: row.read_at != null,
  };
}

async function myProfile(): Promise<ProfileRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error || !data) throw error ?? new Error('Profile not found');
  return data;
}

async function loadWorkoutProgress(): Promise<Record<string, Record<number, string[]>>> {
  const raw = await AsyncStorage.getItem(WORKOUT_PROGRESS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveWorkoutProgress(data: Record<string, Record<number, string[]>>): Promise<void> {
  await AsyncStorage.setItem(WORKOUT_PROGRESS_KEY, JSON.stringify(data));
}

export const repository = {
  async listAthletes(): Promise<Athlete[]> {
    const { athletes } = await this.getFullContext();
    return athletes;
  },

  async getAthlete(athleteId: string): Promise<Athlete | undefined> {
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', athleteId).single();
    if (error || !profile) return undefined;
    const [logs, tests] = await Promise.all([this.getWeeklyLogs(athleteId), this.getStrengthTests(athleteId)]);
    return toAthlete(profile, logs, tests);
  },

  async getWeeklyLogs(athleteId: string): Promise<WeeklyLog[]> {
    const { data, error } = await supabase
      .from('weekly_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('week_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toWeeklyLog);
  },

  async submitWeeklyResult(
    athleteId: string,
    entry: {
      mark: number | null;
      rpe: number | null;
      sleep: number | null;
      soreness: number | null;
      energy: number | null;
      notes?: string | null;
    },
  ): Promise<{ log: WeeklyLog; isNewPersonalBest: boolean }> {
    const [profile, existingLogs] = await Promise.all([myProfile(), this.getWeeklyLogs(athleteId)]);
    if (!profile.programme_id) throw new Error('No programme assigned');

    const nextWeek = (existingLogs[existingLogs.length - 1]?.week ?? 0) + 1;
    const priorBest = existingLogs.reduce((max, l) => (l.mark != null && l.mark > max ? l.mark : max), 0);

    const { data, error } = await supabase
      .from('weekly_logs')
      .insert({
        athlete_id: athleteId,
        programme_id: profile.programme_id,
        week_number: nextWeek,
        week_start: new Date().toISOString().slice(0, 10),
        best_throw: entry.mark,
        rpe: entry.rpe,
        sleep_score: entry.sleep,
        soreness_score: entry.soreness,
        energy_score: entry.energy,
        notes: entry.notes ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not save log');

    const isNewPersonalBest = entry.mark != null && entry.mark > priorBest && existingLogs.length > 0;
    return { log: toWeeklyLog(data), isNewPersonalBest };
  },

  async getStrengthTests(athleteId: string): Promise<StrengthTest[]> {
    const { data, error } = await supabase
      .from('strength_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('logged_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toStrengthTest);
  },

  async getMeets(): Promise<Meet[]> {
    return STATIC_MEETS;
  },

  async getNotifications(): Promise<AppNotification[]> {
    const { data, error } = await supabase.from('notifications_log').select('*').order('sent_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toNotification);
  },

  async markNotificationRead(id: string): Promise<void> {
    await supabase.from('notifications_log').update({ read_at: new Date().toISOString() }).eq('id', id);
  },

  async getMyProgrammeJoinCode(): Promise<string | null> {
    const profile = await myProfile();
    if (!profile.programme_id) return null;
    const { data } = await supabase.from('programmes').select('join_code').eq('id', profile.programme_id).single();
    return data?.join_code ?? null;
  },

  async getMyProgrammeId(): Promise<string | null> {
    const profile = await myProfile();
    return profile.programme_id;
  },

  async getMesocycleWeek(): Promise<number> {
    const profile = await myProfile();
    if (!profile.programme_id) return 1;
    const { data } = await supabase
      .from('workouts')
      .select('week_number')
      .eq('programme_id', profile.programme_id)
      .order('week_number', { ascending: false })
      .limit(1);
    return data?.[0]?.week_number ?? 1;
  },

  async getWorkoutForWeek(weekNumber: number): Promise<Workout | null> {
    const profile = await myProfile();
    if (!profile.programme_id) return null;
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('programme_id', profile.programme_id)
      .eq('week_number', weekNumber)
      .maybeSingle();
    return data ? toWorkout(data) : null;
  },

  async getWorkoutProgress(athleteId: string, week: number): Promise<string[]> {
    const progress = await loadWorkoutProgress();
    return progress[athleteId]?.[week] ?? [];
  },

  async toggleWorkoutExercise(athleteId: string, week: number, exerciseId: string): Promise<string[]> {
    const progress = await loadWorkoutProgress();
    const forAthlete = progress[athleteId] ?? (progress[athleteId] = {});
    const done = new Set(forAthlete[week] ?? []);
    if (done.has(exerciseId)) done.delete(exerciseId);
    else done.add(exerciseId);
    forAthlete[week] = Array.from(done);
    await saveWorkoutProgress(progress);
    return forAthlete[week];
  },

  async getFullContext(): Promise<{
    athletes: Athlete[];
    weeklyLogs: Record<string, WeeklyLog[]>;
    strengthTests: Record<string, StrengthTest[]>;
    meets: Meet[];
  }> {
    const profile = await myProfile();
    const programmeId = profile.programme_id;
    if (!programmeId) return { athletes: [], weeklyLogs: {}, strengthTests: {}, meets: STATIC_MEETS };

    const [{ data: profiles }, { data: logRows }, { data: strengthRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('programme_id', programmeId).eq('role', 'athlete'),
      supabase.from('weekly_logs').select('*').eq('programme_id', programmeId).order('week_number', { ascending: true }),
      supabase.from('strength_logs').select('*').eq('programme_id', programmeId).order('logged_at', { ascending: true }),
    ]);

    const weeklyLogs: Record<string, WeeklyLog[]> = {};
    for (const row of logRows ?? []) {
      (weeklyLogs[row.athlete_id] ??= []).push(toWeeklyLog(row));
    }
    const strengthTests: Record<string, StrengthTest[]> = {};
    for (const row of strengthRows ?? []) {
      (strengthTests[row.athlete_id] ??= []).push(toStrengthTest(row));
    }

    const athletes = (profiles ?? []).map((p) => toAthlete(p, weeklyLogs[p.id] ?? [], strengthTests[p.id] ?? []));

    return { athletes, weeklyLogs, strengthTests, meets: STATIC_MEETS };
  },
};
