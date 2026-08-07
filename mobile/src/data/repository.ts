import { supabase } from '@/lib/supabase';
import { EVENT_GROUP_DIRECTION, isBetter, type EventGroup, type PerformanceUnit } from '@/lib/formatPerformance';
import { edgeFunctionErrorMessage } from '@/lib/edgeFunctionError';
import { genId } from '@/lib/id';
import type {
  Athlete,
  AppNotification,
  AthleteNote,
  AthleteStatus,
  BlockExercise,
  BlockType,
  JumpsConfig,
  Meet,
  MeetAttempt,
  MeetEntry,
  MeetType,
  NoteType,
  ProgrammeConfig,
  SprintsConfig,
  StrengthTest,
  ThrowsConfig,
  WeeklyLog,
  Workout,
  WorkoutBlock,
} from './types';
import type { Database } from '../../types/supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type WeeklyLogRow = Database['public']['Tables']['weekly_logs']['Row'];
type StrengthLogRow = Database['public']['Tables']['strength_logs']['Row'];
type NotificationRow = Database['public']['Tables']['notifications_log']['Row'];
type WorkoutRow = Database['public']['Tables']['workouts']['Row'];
type MeetRow = Database['public']['Tables']['meets']['Row'];
type MeetEntryRow = Database['public']['Tables']['meet_entries']['Row'];
type MeetEntryAthleteViewRow = Database['public']['Views']['meet_entries_athlete_view']['Row'];
type AthleteNoteRow = Database['public']['Tables']['athlete_notes']['Row'];

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function toBlockExercise(e: unknown): BlockExercise {
  const ex = (e ?? {}) as Record<string, unknown>;
  return {
    id: str(ex.id) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: str(ex.name) ?? '',
    category: str(ex.category),
    sets: num(ex.sets),
    repsPattern: str(ex.repsPattern),
    pctOfMax: num(ex.pctOfMax),
    weightLbs: num(ex.weightLbs),
    distanceMetres: num(ex.distanceMetres),
    intensityPct: num(ex.intensityPct),
    restSeconds: num(ex.restSeconds),
    timeSeconds: num(ex.timeSeconds),
    coachingCue: str(ex.coachingCue),
    notes: str(ex.notes),
  };
}

function toWorkoutBlock(b: unknown): WorkoutBlock {
  const block = (b ?? {}) as Record<string, unknown>;
  const rawExercises = Array.isArray(block.exercises) ? block.exercises : [];
  return {
    id: str(block.id) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: (str(block.type) ?? 'weightlifting') as BlockType,
    label: str(block.label) ?? '',
    order: typeof block.order === 'number' ? block.order : 0,
    exercises: rawExercises.map(toBlockExercise),
    // Blocks saved before per-day scheduling existed have no `day` in their stored JSON —
    // they apply to every day of the week, same as an explicit "General" block does.
    day: typeof block.day === 'number' ? block.day : null,
  };
}

function toWorkout(row: WorkoutRow): Workout {
  const raw = Array.isArray(row.blocks) ? row.blocks : [];
  const blocks = raw.map(toWorkoutBlock).sort((a, b) => a.order - b.order);
  return {
    weekNumber: row.week_number,
    intensityPct: row.intensity_pct ?? 0,
    roundingIncrement: row.rounding_increment ?? 5,
    blocks,
  };
}

function fromWorkout(workout: { intensityPct: number; roundingIncrement: number; blocks: WorkoutBlock[] }) {
  return {
    intensity_pct: workout.intensityPct,
    rounding_increment: workout.roundingIncrement,
    blocks: workout.blocks as unknown as Database['public']['Tables']['workouts']['Insert']['blocks'],
  };
}

/** Starting point for a week with no saved plan yet — an empty week, ready for the coach to add blocks to. */
export function defaultWorkoutTemplate(weekNumber: number): Workout {
  const intensities = [0.75, 0.78, 0.8, 0.85, 0.7, 0.82, 0.85, 0.9];
  const intensityPct = intensities[(weekNumber - 1) % intensities.length];
  return { weekNumber, intensityPct, roundingIncrement: 5, blocks: [] };
}

function toMeet(row: MeetRow): Meet {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    standards: (row.standards as Record<string, number> | null) ?? {},
    location: row.location,
    meetType: row.meet_type as MeetType | null,
    conditions: row.conditions,
    generalNotes: row.general_notes,
    completed: row.completed,
  };
}

function toMeetAttempts(raw: unknown): MeetAttempt[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => {
    const r = (a ?? {}) as Record<string, unknown>;
    return {
      attempt: typeof r.attempt === 'number' ? r.attempt : 0,
      mark: typeof r.mark === 'number' ? r.mark : null,
      wind: typeof r.wind === 'string' ? r.wind : null,
      foul: r.foul === true,
      notes: typeof r.notes === 'string' ? r.notes : '',
    };
  });
}

function toMeetEntry(row: MeetEntryRow | MeetEntryAthleteViewRow): MeetEntry {
  const priv = row as Partial<MeetEntryRow>;
  return {
    id: row.id as string,
    meetId: row.meet_id as string,
    athleteId: row.athlete_id as string,
    event: row.event as string,
    bibNumber: (row as MeetEntryRow).bib_number ?? null,
    seedMark: row.seed_mark as number | null,
    attempts: toMeetAttempts(row.attempts),
    finalMark: row.final_mark as number | null,
    place: row.place as number | null,
    qualified: !!row.qualified,
    coachNotes: priv.coach_notes ?? null,
    technicalCues: priv.technical_cues ?? null,
    nextSteps: priv.next_steps ?? null,
    createdAt: row.created_at as string,
  };
}

function toAthleteNote(row: AthleteNoteRow): AthleteNote {
  return {
    id: row.id,
    programmeId: row.programme_id,
    athleteId: row.athlete_id,
    coachId: row.coach_id,
    noteDate: row.note_date,
    noteType: row.note_type as NoteType,
    body: row.body,
    flagFollowup: row.flag_followup,
    createdAt: row.created_at,
  };
}

const EPOCH_MONDAY_UTC = Date.UTC(2020, 0, 6);
/** Deterministic Mon–Sun (UTC) week bucket for a "YYYY-MM-DD" date string — used only to detect
 *  "already logged this calendar week" (not tied to real ISO week numbers, just needs consistent equality). */
function weekBucket(dateStr: string): number {
  return Math.floor((new Date(`${dateStr}T00:00:00Z`).getTime() - EPOCH_MONDAY_UTC) / (7 * 24 * 60 * 60 * 1000));
}

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
    motivation: row.motivation_score,
    bodyWeight: row.body_weight,
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
    // target maxes default to +10% over current (a conventional next-block
    // goal) so strength gauges aren't always full — not part of the backend schema.
    status: (profile.status as AthleteStatus | undefined) ?? 'active',
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
    dateOfBirth: profile.date_of_birth ?? null,
    classCategory: profile.class_category ?? null,
    joinedAt: profile.created_at,
  };
}

const NOTIFICATION_COPY: Record<string, { title: string; severity: AppNotification['severity'] }> = {
  pb: { title: 'New PB', severity: 'success' },
  missing_log: { title: 'Missing log', severity: 'danger' },
  high_rpe: { title: 'High RPE', severity: 'warning' },
  anomaly: { title: 'Anomaly', severity: 'warning' },
  qualifying_risk: { title: 'Qualifying risk', severity: 'warning' },
  meet_pb: { title: 'Meet PB', severity: 'success' },
  meet_qualified: { title: 'Qualified', severity: 'success' },
  broadcast: { title: 'Message from your coach', severity: 'info' },
  workout_complete: { title: 'Workout completed', severity: 'success' },
  meet_added: { title: 'Added to a meet', severity: 'info' },
};
// Any notification type not yet in the map above (e.g. a new one added on the
// backend before the app is updated) falls back to this rather than crashing
// the whole notifications list — row.type was previously used as a direct,
// unchecked object-key lookup here.
const DEFAULT_NOTIFICATION_COPY = { title: 'Notification', severity: 'info' as const };

function toNotification(row: NotificationRow): AppNotification {
  const copy = NOTIFICATION_COPY[row.type] ?? DEFAULT_NOTIFICATION_COPY;
  return {
    id: row.id,
    athleteId: row.athlete_id,
    title: copy.title,
    body: row.message,
    severity: copy.severity,
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

export interface ProfileEditableFields {
  name?: string;
  event?: string;
  eventGroup?: EventGroup;
  group?: string;
  baselineMark?: number;
  qualifyingStandard?: number;
  qualifyingEvent?: string;
  dateOfBirth?: string | null;
  classCategory?: string | null;
  status?: AthleteStatus;
  mustChangePassword?: boolean;
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
  if (fields.dateOfBirth !== undefined) row.date_of_birth = fields.dateOfBirth;
  if (fields.classCategory !== undefined) row.class_category = fields.classCategory;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.mustChangePassword !== undefined) row.must_change_password = fields.mustChangePassword;
  return row;
}

function toProgrammeConfig(
  eventGroups: EventGroup[],
  config: Database['public']['Tables']['programme_config']['Row'] | null,
  seasonStartDate: string | null,
): ProgrammeConfig {
  return {
    eventGroups,
    throws: (config?.throws_config as ThrowsConfig | null) ?? null,
    sprints: (config?.sprints_config as SprintsConfig | null) ?? null,
    jumps: (config?.jumps_config as JumpsConfig | null) ?? null,
    competitionDate: config?.competition_date ?? null,
    seasonStartDate,
  };
}

export const repository = {
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

  /** Upsert, not insert — strength_logs has a unique (athlete_id, logged_at) constraint, and
   *  the log form always defaults its date field to today, so re-logging (or correcting) a
   *  test on the same date is a common, legitimate action, not an error. A bare insert threw
   *  a unique-violation on that second save; upserting on the same key updates it instead. */
  async addStrengthLog(
    athleteId: string,
    entry: { loggedAt: string; squat: number | null; bench: number | null; clean: number | null; deadlift: number | null },
  ): Promise<void> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { error } = await supabase.from('strength_logs').upsert(
      {
        athlete_id: athleteId,
        programme_id: profile.programme_id,
        logged_at: entry.loggedAt,
        squat_1rm: entry.squat,
        bench_1rm: entry.bench,
        clean_1rm: entry.clean,
        deadlift_1rm: entry.deadlift,
      },
      { onConflict: 'athlete_id,logged_at' },
    );
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
    dateOfBirth?: string;
    classCategory?: string;
  }): Promise<{ athleteId: string }> {
    const { data, error } = await supabase.functions.invoke<{ athleteId: string }>('add-athlete', { body: input });
    if (error || !data) throw new Error(await edgeFunctionErrorMessage(error, 'Could not add athlete'));
    return data;
  },

  /** Fully removes an athlete from the coach's programme (deletes their account). */
  async removeAthlete(athleteId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('remove-athlete', { body: { athleteId } });
    if (error) throw new Error(await edgeFunctionErrorMessage(error, 'Could not remove that athlete'));
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
      motivation?: number | null;
      bodyWeight?: number | null;
      notes?: string | null;
    },
  ): Promise<{ log: WeeklyLog; isNewPersonalBest: boolean }> {
    const [profile, existingLogs] = await Promise.all([myProfile(), this.getWeeklyLogs(athleteId)]);
    if (!profile.programme_id) throw new Error('No programme assigned');

    const eventGroup = (profile.event_group as EventGroup | null) ?? 'throws';
    const direction = EVENT_GROUP_DIRECTION[eventGroup];
    const unit: PerformanceUnit = eventGroup === 'sprints' ? 'seconds' : 'metres';

    const today = new Date().toISOString().slice(0, 10);
    const lastLog = existingLogs[existingLogs.length - 1];
    // A second log within the same calendar week updates that week's row rather than minting a
    // new "week" — week_number is otherwise a plain incrementing counter with no calendar meaning,
    // so double-submitting used to silently fabricate an extra week and drag the whole squad's
    // currentWeekFromLogs() (the max week_number across every athlete) ahead of everyone else.
    const updatingThisWeek = lastLog?.loggedAt != null && weekBucket(lastLog.loggedAt) === weekBucket(today);
    const priorLogs = updatingThisWeek ? existingLogs.slice(0, -1) : existingLogs;

    let priorBest: number | null = null;
    for (const l of priorLogs) {
      if (l.mark == null) continue;
      if (priorBest == null || isBetter(l.mark, priorBest, direction)) priorBest = l.mark;
    }

    const fields = {
      best_performance: entry.mark,
      performance_unit: unit,
      // Kept in sync for anything still reading the legacy throws-only column.
      best_throw: unit === 'metres' ? entry.mark : null,
      rpe: entry.rpe,
      sleep_score: entry.sleep,
      soreness_score: entry.soreness,
      energy_score: entry.energy,
      motivation_score: entry.motivation ?? null,
      body_weight: entry.bodyWeight ?? null,
      notes: entry.notes ?? null,
    };

    const { data, error } = updatingThisWeek
      ? await supabase
          .from('weekly_logs')
          .update({ ...fields, week_start: today })
          .eq('athlete_id', athleteId)
          .eq('week_number', lastLog!.week)
          .select()
          .single()
      : await supabase
          .from('weekly_logs')
          .insert({
            athlete_id: athleteId,
            programme_id: profile.programme_id,
            week_number: (lastLog?.week ?? 0) + 1,
            week_start: today,
            ...fields,
          })
          .select()
          .single();
    if (error || !data) throw error ?? new Error('Could not save log');

    const isNewPersonalBest =
      entry.mark != null && priorLogs.length > 0 && (priorBest == null || isBetter(entry.mark, priorBest, direction));
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

  async getMeetResultsForAthlete(athleteId: string): Promise<{ entry: MeetEntry; meet: Meet }[]> {
    const { data: entryRows, error } = await supabase
      .from('meet_entries')
      .select('*')
      .eq('athlete_id', athleteId)
      .not('final_mark', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const entries = (entryRows ?? []).map(toMeetEntry);
    if (entries.length === 0) return [];
    const meetIds = Array.from(new Set(entries.map((e) => e.meetId)));
    const { data: meetRows } = await supabase.from('meets').select('*').in('id', meetIds);
    const meetsById = new Map((meetRows ?? []).map((m) => [m.id, toMeet(m)]));
    return entries.map((entry) => ({ entry, meet: meetsById.get(entry.meetId) })).filter((r): r is { entry: MeetEntry; meet: Meet } => !!r.meet);
  },

  async getMeet(id: string): Promise<Meet | null> {
    const { data, error } = await supabase.from('meets').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toMeet(data) : null;
  },

  async getMeetEntryByAthlete(meetId: string, athleteId: string): Promise<MeetEntry | null> {
    const { data, error } = await supabase.from('meet_entries').select('*').eq('meet_id', meetId).eq('athlete_id', athleteId).maybeSingle();
    if (error) throw error;
    return data ? toMeetEntry(data) : null;
  },

  async getMeetEntryCountsByMeet(): Promise<Record<string, number>> {
    const profile = await myProfile();
    if (!profile.programme_id) return {};
    const { data, error } = await supabase.from('meet_entries').select('meet_id').eq('programme_id', profile.programme_id);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data ?? []) counts[row.meet_id] = (counts[row.meet_id] ?? 0) + 1;
    return counts;
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

  async createMeet(input: {
    name: string;
    date: string;
    standards: Record<string, number>;
    location?: string;
    meetType?: MeetType;
    conditions?: string;
  }): Promise<Meet> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { data, error } = await supabase
      .from('meets')
      .insert({
        programme_id: profile.programme_id,
        name: input.name,
        date: input.date,
        standards: input.standards,
        location: input.location ?? null,
        meet_type: input.meetType ?? null,
        conditions: input.conditions ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not create meet');
    return toMeet(data);
  },

  async updateMeet(
    id: string,
    input: Partial<{
      name: string;
      date: string;
      standards: Record<string, number>;
      location: string | null;
      meetType: MeetType | null;
      conditions: string | null;
      generalNotes: string | null;
    }>,
  ): Promise<void> {
    const row: Database['public']['Tables']['meets']['Update'] = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.date !== undefined) row.date = input.date;
    if (input.standards !== undefined) row.standards = input.standards;
    if (input.location !== undefined) row.location = input.location;
    if (input.meetType !== undefined) row.meet_type = input.meetType;
    if (input.conditions !== undefined) row.conditions = input.conditions;
    if (input.generalNotes !== undefined) row.general_notes = input.generalNotes;
    const { error } = await supabase.from('meets').update(row).eq('id', id);
    if (error) throw error;
  },

  /** Explicit "mark as completed"/"reopen" action on the Meets screen — kept as its own
   *  small mutator (not folded into updateMeet's patch shape) since it's a one-tap toggle
   *  with no form around it. */
  async setMeetCompleted(id: string, completed: boolean): Promise<void> {
    const { error } = await supabase.from('meets').update({ completed }).eq('id', id);
    if (error) throw error;
  },

  async getMeetEntries(meetId: string): Promise<MeetEntry[]> {
    const { data, error } = await supabase.from('meet_entries').select('*').eq('meet_id', meetId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toMeetEntry);
  },

  async addMeetEntry(input: { meetId: string; athleteId: string; event: string; bibNumber?: string; seedMark?: number }): Promise<MeetEntry> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { data, error } = await supabase
      .from('meet_entries')
      .insert({
        meet_id: input.meetId,
        athlete_id: input.athleteId,
        programme_id: profile.programme_id,
        event: input.event,
        bib_number: input.bibNumber ?? null,
        seed_mark: input.seedMark ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not add athlete to meet');
    return toMeetEntry(data);
  },

  async updateMeetEntry(
    id: string,
    patch: Partial<{
      attempts: MeetAttempt[];
      finalMark: number | null;
      place: number | null;
      qualified: boolean;
      coachNotes: string | null;
      technicalCues: string | null;
      nextSteps: string | null;
      bibNumber: string | null;
      seedMark: number | null;
    }>,
  ): Promise<void> {
    const row: Database['public']['Tables']['meet_entries']['Update'] = {};
    if (patch.attempts !== undefined) row.attempts = patch.attempts as unknown as Database['public']['Tables']['meet_entries']['Update']['attempts'];
    if (patch.finalMark !== undefined) row.final_mark = patch.finalMark;
    if (patch.place !== undefined) row.place = patch.place;
    if (patch.qualified !== undefined) row.qualified = patch.qualified;
    if (patch.coachNotes !== undefined) row.coach_notes = patch.coachNotes;
    if (patch.technicalCues !== undefined) row.technical_cues = patch.technicalCues;
    if (patch.nextSteps !== undefined) row.next_steps = patch.nextSteps;
    if (patch.bibNumber !== undefined) row.bib_number = patch.bibNumber;
    if (patch.seedMark !== undefined) row.seed_mark = patch.seedMark;
    const { error } = await supabase.from('meet_entries').update(row).eq('id', id);
    if (error) throw error;
  },

  async getMyMeetEntries(): Promise<{ entry: MeetEntry; meet: Meet }[]> {
    const profile = await myProfile();
    const { data: entryRows, error } = await supabase
      .from('meet_entries_athlete_view')
      .select('*')
      .eq('athlete_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const entries = (entryRows ?? []).map(toMeetEntry);
    if (entries.length === 0) return [];
    const meetIds = Array.from(new Set(entries.map((e) => e.meetId)));
    const { data: meetRows } = await supabase.from('meets').select('*').in('id', meetIds);
    const meetsById = new Map((meetRows ?? []).map((m) => [m.id, toMeet(m)]));
    return entries.map((entry) => ({ entry, meet: meetsById.get(entry.meetId) })).filter((r): r is { entry: MeetEntry; meet: Meet } => !!r.meet);
  },

  async getAthleteNotes(filter?: { athleteId?: string }): Promise<AthleteNote[]> {
    const profile = await myProfile();
    if (!profile.programme_id) return [];
    let query = supabase
      .from('athlete_notes')
      .select('*')
      .eq('programme_id', profile.programme_id)
      .order('note_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (filter?.athleteId) query = query.eq('athlete_id', filter.athleteId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toAthleteNote);
  },

  async createAthleteNote(input: { athleteId: string; noteDate: string; noteType: NoteType; body: string; flagFollowup: boolean }): Promise<AthleteNote> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { data, error } = await supabase
      .from('athlete_notes')
      .insert({
        programme_id: profile.programme_id,
        athlete_id: input.athleteId,
        coach_id: profile.id,
        note_date: input.noteDate,
        note_type: input.noteType,
        body: input.body,
        flag_followup: input.flagFollowup,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Could not save note');
    return toAthleteNote(data);
  },

  async updateAthleteNote(
    id: string,
    patch: Partial<{ athleteId: string; noteDate: string; noteType: NoteType; body: string; flagFollowup: boolean }>,
  ): Promise<void> {
    const row: Database['public']['Tables']['athlete_notes']['Update'] = {};
    if (patch.athleteId !== undefined) row.athlete_id = patch.athleteId;
    if (patch.noteDate !== undefined) row.note_date = patch.noteDate;
    if (patch.noteType !== undefined) row.note_type = patch.noteType;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.flagFollowup !== undefined) row.flag_followup = patch.flagFollowup;
    const { error } = await supabase.from('athlete_notes').update(row).eq('id', id);
    if (error) throw error;
  },

  async deleteAthleteNote(id: string): Promise<void> {
    const { error } = await supabase.from('athlete_notes').delete().eq('id', id);
    if (error) throw error;
  },

  /** Sends a push + in-app notification to the whole squad, or to specific athletes if athleteIds is non-empty. */
  async broadcastToSquad(message: string, athleteIds?: string[]): Promise<{ sent: number }> {
    const { data, error } = await supabase.functions.invoke<{ sent: number }>('broadcast', {
      body: { message, athleteIds },
    });
    if (error || !data) throw new Error(await edgeFunctionErrorMessage(error, 'Could not send broadcast'));
    return data;
  },

  /** Athlete ids this coach has dismissed from the "Missing this week" list for a given
   *  week_number. Scoped per week by design — a new week has no dismissal rows at all,
   *  so nothing is pre-dismissed there, rather than needing any explicit "reset" logic. */
  async getMissingLogDismissals(weekNumber: number): Promise<string[]> {
    const profile = await myProfile();
    const { data, error } = await supabase
      .from('missing_log_dismissals')
      .select('athlete_id')
      .eq('coach_id', profile.id)
      .eq('week_number', weekNumber);
    if (error) throw error;
    return (data ?? []).map((d) => d.athlete_id);
  },

  async dismissMissingLog(athleteId: string, weekNumber: number): Promise<void> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { error } = await supabase.from('missing_log_dismissals').upsert(
      { coach_id: profile.id, athlete_id: athleteId, programme_id: profile.programme_id, week_number: weekNumber },
      { onConflict: 'coach_id,athlete_id,week_number' },
    );
    if (error) throw error;
  },

  async getNotifications(): Promise<AppNotification[]> {
    const { data, error } = await supabase.from('notifications_log').select('*').order('sent_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toNotification);
  },

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications_log').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
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
      supabase.from('programmes').select('event_groups, season_start_date').eq('id', profile.programme_id).single(),
      supabase.from('programme_config').select('*').eq('programme_id', profile.programme_id).maybeSingle(),
    ]);
    return toProgrammeConfig(
      ((programme?.event_groups as EventGroup[] | undefined) ?? []),
      config ?? null,
      programme?.season_start_date ?? null,
    );
  },

  /** Sets the Monday of training week 1 — the sole calendar-date anchor for the whole programme.
   *  Kept separate from saveProgrammeConfig (which owns programme_config/event groups on a
   *  different table) so a lightweight "set your season start" prompt on the Calendar screen
   *  doesn't need a full EventConfigForm draft in scope just to write one date. */
  async updateSeasonStartDate(date: string | null): Promise<void> {
    const profile = await myProfile();
    if (!profile.programme_id) throw new Error('No programme assigned');
    const { error } = await supabase.from('programmes').update({ season_start_date: date }).eq('id', profile.programme_id);
    if (error) throw error;
  },

  /** Only writes training configuration (lifts, zones, toggles, calculation method) and the
   *  competition date. Qualifying standards live on this same DB row (`qualifying_standards`)
   *  but are owned by the Meets → Standards tab now — deliberately never read or written here
   *  so this screen can't clobber them. */
  async saveProgrammeConfig(input: {
    eventGroups: EventGroup[];
    throws?: ThrowsConfig | null;
    sprints?: SprintsConfig | null;
    jumps?: JumpsConfig | null;
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
    // Skips any row with no blocks (e.g. an accidental empty save) so a stray blank week never
    // hides the last real published week from every athlete's home screen.
    const { data } = await supabase
      .from('workouts')
      .select('week_number, blocks')
      .eq('programme_id', profile.programme_id)
      .order('week_number', { ascending: false })
      .limit(5);
    const withBlocks = (data ?? []).find((row) => Array.isArray(row.blocks) && row.blocks.length > 0);
    return withBlocks?.week_number ?? data?.[0]?.week_number ?? 1;
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

  /** Calendar screen's long-press "copy session to another day" — deep-clones fromDay's blocks
   *  (new ids, day reassigned, appended after toDay's existing blocks) and saves immediately, unlike
   *  the Workout Builder's draft-then-"Save week" flow, since this is a one-shot action from a card.
   *  General (day: null) blocks are never copied — they already apply to every day. */
  async copyWorkoutDay(weekNumber: number, fromDay: number, toDay: number): Promise<Workout> {
    const workout = await this.getWorkoutForWeek(weekNumber);
    if (!workout) throw new Error('No workout found for that week');
    const source = workout.blocks.filter((b) => b.day === fromDay);
    if (source.length === 0) throw new Error('Nothing to copy on that day');
    const existingOnTarget = workout.blocks.filter((b) => b.day === toDay);
    const startOrder = existingOnTarget.length ? Math.max(...existingOnTarget.map((b) => b.order)) + 1 : 0;
    const cloned = source.map((b, i) => ({
      ...b,
      id: genId(),
      day: toDay,
      order: startOrder + i,
      exercises: b.exercises.map((e) => ({ ...e, id: genId() })),
    }));
    return this.saveWorkout({ ...workout, blocks: [...workout.blocks, ...cloned] });
  },

  /** AI-generates a set of blocks for a week, constrained to the app's known exercise vocabulary. Not auto-saved — caller merges into the editable draft. */
  async generateWorkout(input: { eventGroup: EventGroup; weekNumber: number; intensityPct?: number; focus?: string }): Promise<{
    blocks: { type: BlockType; label: string; exercises: Omit<BlockExercise, 'id' | 'category' | 'weightLbs'>[] }[];
  }> {
    const { data, error } = await supabase.functions.invoke<{
      blocks: { type: BlockType; label: string; exercises: Omit<BlockExercise, 'id' | 'category' | 'weightLbs'>[] }[];
    }>('generate-workout', { body: input });
    if (error || !data) throw new Error(await edgeFunctionErrorMessage(error, 'Could not generate workout'));
    return data;
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

  /** Per-exercise checklist state, plus whether this week has already been submitted to the coach. */
  async getWorkoutProgress(athleteId: string, week: number): Promise<{ completedIds: string[]; submittedAt: string | null }> {
    const { data, error } = await supabase
      .from('workout_completions')
      .select('completed_exercise_ids, submitted_at')
      .eq('athlete_id', athleteId)
      .eq('week_number', week)
      .maybeSingle();
    if (error) throw error;
    return { completedIds: (data?.completed_exercise_ids as string[] | null) ?? [], submittedAt: data?.submitted_at ?? null };
  },

  /** Uses the toggle_workout_exercise() RPC (row-locked, single statement) rather than a
   *  client-side read-modify-write — two exercises toggled in quick succession must not race. */
  async toggleWorkoutExercise(week: number, exerciseId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('toggle_workout_exercise', { p_week_number: week, p_exercise_id: exerciseId });
    if (error) throw error;
    return (data as string[] | null) ?? [];
  },

  /** Explicit "submit to coach" action — sends an in-app + push notification, distinct from the per-exercise checklist above. */
  async submitWorkoutToCoach(week: number, completedExerciseIds: string[]): Promise<void> {
    const { error } = await supabase.functions.invoke('submit-workout', {
      body: { weekNumber: week, completedExerciseIds },
    });
    if (error) throw new Error(await edgeFunctionErrorMessage(error, 'Could not submit your workout'));
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
