import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { EVENT_GROUP_DIRECTION, isBetter, type EventGroup, type PerformanceUnit } from '@/lib/formatPerformance';
import type {
  Athlete,
  AppNotification,
  JumpsConfig,
  Meet,
  ProgrammeConfig,
  SprintsConfig,
  StrengthTest,
  ThrowsConfig,
  WeeklyLog,
  Workout,
  WorkoutExercise,
  WorkoutLift,
} from './types';
import type { Database } from '../../types/supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type WeeklyLogRow = Database['public']['Tables']['weekly_logs']['Row'];
type StrengthLogRow = Database['public']['Tables']['strength_logs']['Row'];
type NotificationRow = Database['public']['Tables']['notifications_log']['Row'];
type WorkoutRow = Database['public']['Tables']['workouts']['Row'];
type MeetRow = Database['public']['Tables']['meets']['Row'];

const VALID_LIFTS: WorkoutLift[] = ['squat', 'clean', 'bench', 'deadlift'];

function toWorkout(row: WorkoutRow): Workout {
  const raw = Array.isArray(row.exercises) ? row.exercises : [];
  const exercises: WorkoutExercise[] = raw.map((e) => {
    const ex = e as Record<string, unknown>;
    const lift = typeof ex.lift === 'string' && (VALID_LIFTS as string[]).includes(ex.lift) ? (ex.lift as WorkoutLift) : null;
    const weightOverride = typeof ex.weightOverride === 'number' ? ex.weightOverride : null;
    return { name: String(ex.name ?? ''), sets: Number(ex.sets ?? 0), reps: Number(ex.reps ?? 0), lift, weightOverride };
  });
  return {
    weekNumber: row.week_number,
    intensityPct: row.intensity_pct ?? 0,
    roundingIncrement: row.rounding_increment ?? 5,
    exercises,
  };
}

function fromWorkout(workout: { intensityPct: number; roundingIncrement: number; exercises: WorkoutExercise[] }) {
  return {
    intensity_pct: workout.intensityPct,
    rounding_increment: workout.roundingIncrement,
    exercises: workout.exercises as unknown as Database['public']['Tables']['workouts']['Insert']['exercises'],
  };
}

/** Sensible starting point for a week with no saved workout yet — coaches edit from here. */
export function defaultWorkoutTemplate(weekNumber: number): Workout {
  const intensities = [0.75, 0.78, 0.8, 0.85, 0.7, 0.82, 0.85, 0.9];
  const intensityPct = intensities[(weekNumber - 1) % intensities.length];
  const sets = 4;
  const reps = 5;
  const exercises: WorkoutExercise[] = [
    { name: 'Back Squat', sets, reps, lift: 'squat', weightOverride: null },
    { name: 'Power Clean', sets, reps: Math.max(2, reps - 1), lift: 'clean', weightOverride: null },
    { name: 'Bench Press', sets, reps: reps + 1, lift: 'bench', weightOverride: null },
    { name: 'Deadlift', sets: Math.max(3, sets - 1), reps, lift: 'deadlift', weightOverride: null },
    { name: 'Med Ball Rotational Throws', sets: 4, reps: 8, lift: null, weightOverride: null },
  ];
  return { weekNumber, intensityPct, roundingIncrement: 5, exercises };
}

function toMeet(row: MeetRow): Meet {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    standards: (row.standards as Record<string, number> | null) ?? {},
  };
}

const WORKOUT_PROGRESS_KEY = 'tru.workoutProgress.v1';

function toWeeklyLog(row: WeeklyLogRow): WeeklyLog {
  return {
    week: row.week_number,
    label: `W${row.week_number}`,
    // best_performance is the current field; best_throw is read as a
    // fallback for rows written before multi-sport support existed.
    mark: row.best_performance ?? row.best_throw,
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
  const eventGroup = (profile.event_group as EventGroup | null) ?? null;
  const direction = EVENT_GROUP_DIRECTION[eventGroup ?? 'throws'];

  let personalBest: number | null = null;
  for (const log of weeklyLogs) {
    if (log.mark == null) continue;
    if (personalBest == null || isBetter(log.mark, personalBest, direction)) personalBest = log.mark;
  }

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
    eventGroup,
    group: profile.group_name ?? '',
    // status/target-maxes aren't part of the backend schema; target maxes
    // default to +10% over current (a conventional next-block goal) so
    // strength gauges aren't always full.
    status: 'active',
    unit: eventGroup === 'sprints' ? 's' : 'm',
    baselineMark: profile.baseline_distance ?? 0,
    personalBest: personalBest ?? 0,
    currentMaxes,
    targetMaxes: {
      squat: Math.round(currentMaxes.squat * 1.1),
      clean: Math.round(currentMaxes.clean * 1.1),
      bench: Math.round(currentMaxes.bench * 1.1),
      deadlift: Math.round(currentMaxes.deadlift * 1.1),
    },
    qualifyingStandard: profile.qualifying_standard ?? 0,
    qualifyingEvent: profile.qualifying_event ?? '',
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

export interface ProfileEditableFields {
  name?: string;
  event?: string;
  eventGroup?: EventGroup;
  group?: string;
  baselineMark?: number;
  qualifyingStandard?: number;
  qualifyingEvent?: string;
}

function profileFieldsToRow(fields: ProfileEditableFields): Database['public']['Tables']['profiles']['Update'] {
  const row: Database['public']['Tables']['profiles']['Update'] = {};
  if (fields.name !== undefined) row.full_name = fields.name;
  if (fields.event !== undefined) row.event = fields.event;
  if (fields.eventGroup !== undefined) row.event_group = fields.eventGroup;
  if (fields.group !== undefined) row.group_name = fields.group;
  if (fields.baselineMark !== undefined) row.baseline_distance = fields.baselineMark;
  if (fields.qualifyingStandard !== undefined) row.qualifying_standard = fields.qualifyingStandard;
  if (fields.qualifyingEvent !== undefined) row.qualifying_event = fields.qualifyingEvent;
  return row;
}

function toProgrammeConfig(
  eventGroups: EventGroup[],
  config: Database['public']['Tables']['programme_config']['Row'] | null,
): ProgrammeConfig {
  return {
    eventGroups,
    throws: (config?.throws_config as ThrowsConfig | null) ?? null,
    sprints: (config?.sprints_config as SprintsConfig | null) ?? null,
    jumps: (config?.jumps_config as JumpsConfig | null) ?? null,
    qualifyingStandards: (config?.qualifying_standards as Record<string, number> | null) ?? {},
    competitionDate: config?.competition_date ?? null,
  };
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

  /** Coach editing an athlete's profile, or an athlete editing their own — RLS enforces who's allowed. */
  async updateProfile(athleteId: string, fields: ProfileEditableFields): Promise<void> {
    const { error } = await supabase.from('profiles').update(profileFieldsToRow(fields)).eq('id', athleteId);
    if (error) throw error;
  },

  async addStrengthLog(
    athleteId: string,
    entry: { loggedAt: string; squat: number | null; bench: number | null; clean: number | null; deadlift: number | null },
  ): Promise<void> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { error } = await supabase.from('strength_logs').insert({
      athlete_id: athleteId,
      programme_id: profile.programme_id,
      logged_at: entry.loggedAt,
      squat_1rm: entry.squat,
      bench_1rm: entry.bench,
      clean_1rm: entry.clean,
      deadlift_1rm: entry.deadlift,
    });
    if (error) throw error;
  },

  /** Coach-initiated athlete creation — no join code needed. Runs server-side via edge function. */
  async addAthlete(input: {
    name: string;
    email: string;
    password: string;
    event: string;
    eventGroup: EventGroup;
    baselineMark?: number;
    qualifyingStandard?: number;
    qualifyingEvent?: string;
  }): Promise<{ athleteId: string }> {
    const { data, error } = await supabase.functions.invoke<{ athleteId: string }>('add-athlete', { body: input });
    if (error || !data) throw error ?? new Error('Could not add athlete');
    return data;
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

    const eventGroup = (profile.event_group as EventGroup | null) ?? 'throws';
    const direction = EVENT_GROUP_DIRECTION[eventGroup];
    const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';

    const nextWeek = (existingLogs[existingLogs.length - 1]?.week ?? 0) + 1;
    let priorBest: number | null = null;
    for (const l of existingLogs) {
      if (l.mark == null) continue;
      if (priorBest == null || isBetter(l.mark, priorBest, direction)) priorBest = l.mark;
    }

    const { data, error } = await supabase
      .from('weekly_logs')
      .insert({
        athlete_id: athleteId,
        programme_id: profile.programme_id,
        week_number: nextWeek,
        week_start: new Date().toISOString().slice(0, 10),
        best_performance: entry.mark,
        performance_unit: unit,
        // Kept in sync for anything still reading the legacy throws-only column.
        best_throw: unit === 'metres' ? entry.mark : null,
        rpe: entry.rpe,
        sleep_score: entry.sleep,
        soreness_score: entry.soreness,
        energy_score: entry.energy,
        notes: entry.notes ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not save log');

    const isNewPersonalBest =
      entry.mark != null && existingLogs.length > 0 && (priorBest == null || isBetter(entry.mark, priorBest, direction));
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
    const profile = await myProfile();
    if (!profile.programme_id) return [];
    const { data, error } = await supabase
      .from('meets')
      .select('*')
      .eq('programme_id', profile.programme_id)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toMeet);
  },

  async createMeet(input: { name: string; date: string; standards: Record<string, number> }): Promise<Meet> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { data, error } = await supabase
      .from('meets')
      .insert({ programme_id: profile.programme_id, name: input.name, date: input.date, standards: input.standards })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not create meet');
    return toMeet(data);
  },

  async updateMeet(id: string, input: { name: string; date: string; standards: Record<string, number> }): Promise<void> {
    const { error } = await supabase
      .from('meets')
      .update({ name: input.name, date: input.date, standards: input.standards })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteMeet(id: string): Promise<void> {
    const { error } = await supabase.from('meets').delete().eq('id', id);
    if (error) throw error;
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

  async getProgrammeConfig(): Promise<ProgrammeConfig | null> {
    const profile = await myProfile();
    if (!profile.programme_id) return null;
    const [{ data: programme }, { data: config }] = await Promise.all([
      supabase.from('programmes').select('event_groups').eq('id', profile.programme_id).single(),
      supabase.from('programme_config').select('*').eq('programme_id', profile.programme_id).maybeSingle(),
    ]);
    return toProgrammeConfig(((programme?.event_groups as EventGroup[] | undefined) ?? []), config ?? null);
  },

  async saveProgrammeConfig(input: {
    eventGroups: EventGroup[];
    throws?: ThrowsConfig | null;
    sprints?: SprintsConfig | null;
    jumps?: JumpsConfig | null;
    qualifyingStandards: Record<string, number>;
    competitionDate: string | null;
  }): Promise<void> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');

    const { error: programmeError } = await supabase
      .from('programmes')
      .update({ event_groups: input.eventGroups })
      .eq('id', profile.programme_id);
    if (programmeError) throw programmeError;

    type ConfigInsert = Database['public']['Tables']['programme_config']['Insert'];
    const { error } = await supabase.from('programme_config').upsert(
      {
        programme_id: profile.programme_id,
        throws_config: (input.throws ?? null) as unknown as ConfigInsert['throws_config'],
        sprints_config: (input.sprints ?? null) as unknown as ConfigInsert['sprints_config'],
        jumps_config: (input.jumps ?? null) as unknown as ConfigInsert['jumps_config'],
        qualifying_standards: input.qualifyingStandards as unknown as ConfigInsert['qualifying_standards'],
        competition_date: input.competitionDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'programme_id' },
    );
    if (error) throw error;
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

  /** Coach create/update for a week's plan (upsert on programme_id+week_number). */
  async saveWorkout(workout: Workout): Promise<Workout> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { data, error } = await supabase
      .from('workouts')
      .upsert(
        { programme_id: profile.programme_id, week_number: workout.weekNumber, ...fromWorkout(workout) },
        { onConflict: 'programme_id,week_number' },
      )
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not save workout');
    return toWorkout(data);
  },

  async listWorkoutWeeks(): Promise<number[]> {
    const profile = await myProfile();
    if (!profile.programme_id) return [];
    const { data, error } = await supabase
      .from('workouts')
      .select('week_number')
      .eq('programme_id', profile.programme_id)
      .order('week_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => r.week_number);
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
    if (!programmeId) return { athletes: [], weeklyLogs: {}, strengthTests: {}, meets: [] };

    const [{ data: profiles }, { data: logRows }, { data: strengthRows }, { data: meetRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('programme_id', programmeId).eq('role', 'athlete'),
      supabase.from('weekly_logs').select('*').eq('programme_id', programmeId).order('week_number', { ascending: true }),
      supabase.from('strength_logs').select('*').eq('programme_id', programmeId).order('logged_at', { ascending: true }),
      supabase.from('meets').select('*').eq('programme_id', programmeId).order('date', { ascending: true }),
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

    return { athletes, weeklyLogs, strengthTests, meets: (meetRows ?? []).map(toMeet) };
  },
};
