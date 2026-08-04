// Fires on weekly_logs insert (via DB trigger, see
// supabase/migrations/20260101000001_notification_wiring.sql) and on a
// weekly pg_cron sweep. Runs as the service role — bypasses RLS by design,
// since this is invoked by Postgres/cron, not a signed-in user.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Expo } from 'npm:expo-server-sdk@3';
import { corsHeaders } from '../_shared/cors.ts';
import { projectToWeek, computeGap, isBetter, formatPerformance, type Direction } from '../_shared/projections.ts';

const HIGH_RPE_THRESHOLD = 8;
const STRENGTH_INCREASE_THRESHOLD = 0.1; // 10%
const FLAT_PERFORMANCE_WEEKS = 3;
const FLAT_PERFORMANCE_RANGE = 0.3; // metres, or seconds for sprints
const QUALIFYING_HORIZON_WEEKS = 4;

const EVENT_GROUP_DIRECTION: Record<string, Direction> = {
  throws: 'higher_better',
  jumps: 'higher_better',
  sprints: 'lower_better',
};

function directionFor(eventGroup: string | null): Direction {
  return EVENT_GROUP_DIRECTION[eventGroup ?? 'throws'] ?? 'higher_better';
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const expo = new Expo();

type NotificationType = 'pb' | 'missing_log' | 'high_rpe' | 'anomaly' | 'qualifying_risk' | 'meet_pb' | 'meet_qualified';

interface WeeklyLogRow {
  id: string;
  athlete_id: string;
  programme_id: string;
  week_number: number;
  best_performance: number | null;
  rpe: number | null;
}

interface MeetEntryRow {
  id: string;
  meet_id: string;
  athlete_id: string;
  programme_id: string;
  event: string;
  final_mark: number | null;
  qualified: boolean;
}

async function pushToUser(userId: string, title: string, body: string, athleteId: string) {
  const { data: profile } = await supabase.from('profiles').select('expo_push_token').eq('id', userId).single();
  const token = profile?.expo_push_token;
  if (!token || !Expo.isExpoPushToken(token)) return;
  try {
    // athleteId lets the app deep-link straight to that athlete's detail
    // screen when the notification is tapped.
    await expo.sendPushNotificationsAsync([{ to: token, sound: 'default', title, body, data: { athleteId } }]);
  } catch (err) {
    console.error('Push send failed', userId, err);
  }
}

async function log(
  athleteId: string,
  programmeId: string,
  type: NotificationType,
  message: string,
  notifyAthlete: boolean,
  notifyCoach: boolean,
  athleteTitle: string,
  coachTitle: string,
) {
  const { error } = await supabase
    .from('notifications_log')
    .insert({ athlete_id: athleteId, programme_id: programmeId, type, message });
  if (error) console.error('notifications_log insert failed', error);

  if (notifyAthlete) await pushToUser(athleteId, athleteTitle, message, athleteId);
  if (notifyCoach) {
    const { data: coaches } = await supabase
      .from('profiles')
      .select('id')
      .eq('programme_id', programmeId)
      .eq('role', 'coach');
    for (const coach of coaches ?? []) {
      await pushToUser(coach.id, coachTitle, message, athleteId);
    }
  }
}

async function checkMeetEntryEvent(record: MeetEntryRow, oldRecord: MeetEntryRow | null, athleteName: string, eventGroup: string | null) {
  const direction = directionFor(eventGroup);
  const unit = eventGroup === 'sprints' ? 'seconds' : 'metres';

  // Qualified just flipped true — notify both athlete and coach.
  if (record.qualified && !oldRecord?.qualified) {
    const message = `${athleteName} qualified ✓ — ${record.event}${record.final_mark != null ? ` (${formatPerformance(record.final_mark, unit)})` : ''}`;
    await log(record.athlete_id, record.programme_id, 'meet_qualified', message, true, true, 'Qualified! ✓', `Qualified — ${athleteName}`);
  }

  // final_mark changed — check if it beats every prior mark (training + other meets).
  if (record.final_mark == null || record.final_mark === oldRecord?.final_mark) return;

  const [{ data: priorLogs }, { data: priorEntries }] = await Promise.all([
    supabase.from('weekly_logs').select('best_performance').eq('athlete_id', record.athlete_id).not('best_performance', 'is', null),
    supabase
      .from('meet_entries')
      .select('final_mark')
      .eq('athlete_id', record.athlete_id)
      .neq('id', record.id)
      .not('final_mark', 'is', null),
  ]);
  const priorMarks = [
    ...((priorLogs ?? []).map((l) => l.best_performance as number)),
    ...((priorEntries ?? []).map((e) => e.final_mark as number)),
  ];
  if (priorMarks.length === 0) return;

  let priorBest: number | null = null;
  for (const v of priorMarks) {
    if (priorBest == null || isBetter(v, priorBest, direction)) priorBest = v;
  }
  if (priorBest != null && isBetter(record.final_mark, priorBest, direction)) {
    const { data: meet } = await supabase.from('meets').select('name').eq('id', record.meet_id).maybeSingle();
    const message = `${athleteName} PB — ${formatPerformance(record.final_mark, unit)} at ${meet?.name ?? 'a meet'}`;
    await log(record.athlete_id, record.programme_id, 'meet_pb', message, false, true, '', `New meet PB — ${athleteName}`);
  }
}

async function checkNewPB(row: WeeklyLogRow, athleteName: string, eventGroup: string | null) {
  if (row.best_performance == null) return;
  const direction = directionFor(eventGroup);
  const unit = eventGroup === 'sprints' ? 'seconds' : 'metres';

  const { data: priorLogs } = await supabase
    .from('weekly_logs')
    .select('best_performance')
    .eq('athlete_id', row.athlete_id)
    .lt('week_number', row.week_number)
    .not('best_performance', 'is', null);
  if (!priorLogs || priorLogs.length === 0) return;

  let priorBest: number | null = null;
  for (const l of priorLogs) {
    const v = l.best_performance as number;
    if (priorBest == null || isBetter(v, priorBest, direction)) priorBest = v;
  }
  if (priorBest != null && isBetter(row.best_performance, priorBest, direction)) {
    const message = `New PB — ${athleteName}: ${formatPerformance(row.best_performance, unit)} (was ${formatPerformance(priorBest, unit)})`;
    await log(row.athlete_id, row.programme_id, 'pb', message, true, true, 'New PB! 🎉', `New PB — ${athleteName}`);
  }
}

async function checkHighRpe(row: WeeklyLogRow, athleteName: string) {
  if (row.rpe == null || row.rpe <= HIGH_RPE_THRESHOLD) return;
  const message = `${athleteName} logged RPE ${row.rpe} in week ${row.week_number}`;
  await log(row.athlete_id, row.programme_id, 'high_rpe', message, false, true, '', `High RPE — ${athleteName}`);
}

async function checkAnomaly(athleteId: string, programmeId: string, athleteName: string) {
  const { data: strengthLogs } = await supabase
    .from('strength_logs')
    .select('logged_at, squat_1rm, bench_1rm, clean_1rm, deadlift_1rm')
    .eq('athlete_id', athleteId)
    .order('logged_at', { ascending: true });
  if (!strengthLogs || strengthLogs.length < 2) return;

  const first = strengthLogs[0];
  const last = strengthLogs[strengthLogs.length - 1];
  const lifts: (keyof typeof first)[] = ['squat_1rm', 'bench_1rm', 'clean_1rm', 'deadlift_1rm'];
  const strengthUp = lifts.some((lift) => {
    const a = first[lift] as number | null;
    const b = last[lift] as number | null;
    return a != null && b != null && a > 0 && (b - a) / a > STRENGTH_INCREASE_THRESHOLD;
  });
  if (!strengthUp) return;

  const { data: recentLogs } = await supabase
    .from('weekly_logs')
    .select('best_performance')
    .eq('athlete_id', athleteId)
    .not('best_performance', 'is', null)
    .order('week_number', { ascending: false })
    .limit(FLAT_PERFORMANCE_WEEKS);
  if (!recentLogs || recentLogs.length < FLAT_PERFORMANCE_WEEKS) return;

  // Flatness (small spread) is direction-agnostic, so this check applies the
  // same way whether the metric trends up (throws/jumps) or down (sprints).
  const marks = recentLogs.map((l) => l.best_performance as number);
  const range = Math.max(...marks) - Math.min(...marks);
  if (range > FLAT_PERFORMANCE_RANGE) return;

  const message = `${athleteName}: strength up >10% but performance flat for ${FLAT_PERFORMANCE_WEEKS}+ weeks — possible technique regression`;
  await log(athleteId, programmeId, 'anomaly', message, false, true, '', `Anomaly — ${athleteName}`);
}

async function checkQualifyingRisk(
  athleteId: string,
  programmeId: string,
  athleteName: string,
  qualifyingStandard: number | null,
  eventGroup: string | null,
) {
  if (qualifyingStandard == null) return;
  const direction = directionFor(eventGroup);
  const unit = eventGroup === 'sprints' ? 'seconds' : 'metres';

  const { data: logs } = await supabase
    .from('weekly_logs')
    .select('week_number, performance:best_performance')
    .eq('athlete_id', athleteId)
    .order('week_number', { ascending: true });
  if (!logs || logs.length === 0) return;

  const lastWeek = logs[logs.length - 1].week_number;
  const projection = projectToWeek(logs, lastWeek + QUALIFYING_HORIZON_WEEKS, direction);
  if (!projection) return;

  const gap = computeGap(projection.projected, qualifyingStandard, direction);
  if (gap > 0) {
    const message = `${athleteName}: projected ${formatPerformance(projection.projected, unit)} vs standard ${formatPerformance(qualifyingStandard, unit)} — qualifying at risk`;
    await log(athleteId, programmeId, 'qualifying_risk', message, false, true, '', `Qualifying risk — ${athleteName}`);
  }
}

async function checkMissingLogsForProgramme(programmeId: string) {
  const { data: athletes } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('programme_id', programmeId)
    .eq('role', 'athlete');
  if (!athletes || athletes.length === 0) return;

  const { data: allLogs } = await supabase
    .from('weekly_logs')
    .select('athlete_id, week_number')
    .eq('programme_id', programmeId);
  const currentWeek = (allLogs ?? []).reduce((max, l) => Math.max(max, l.week_number), 0);
  if (currentWeek === 0) return;

  const loggedThisWeek = new Set((allLogs ?? []).filter((l) => l.week_number === currentWeek).map((l) => l.athlete_id));

  for (const athlete of athletes) {
    if (loggedThisWeek.has(athlete.id)) continue;
    const message = `${athlete.full_name} has no log for week ${currentWeek}`;
    await log(
      athlete.id,
      programmeId,
      'missing_log',
      message,
      true,
      true,
      "Don't forget to log this week",
      `Missing log — ${athlete.full_name}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    if (body.trigger === 'insert' && body.record) {
      const row = body.record as WeeklyLogRow;
      const { data: athlete } = await supabase
        .from('profiles')
        .select('full_name, qualifying_standard, event_group')
        .eq('id', row.athlete_id)
        .single();
      const athleteName = athlete?.full_name ?? 'Athlete';

      await checkNewPB(row, athleteName, athlete?.event_group ?? null);
      await checkHighRpe(row, athleteName);
      await checkAnomaly(row.athlete_id, row.programme_id, athleteName);
      await checkQualifyingRisk(
        row.athlete_id,
        row.programme_id,
        athleteName,
        athlete?.qualifying_standard ?? null,
        athlete?.event_group ?? null,
      );

      return new Response(JSON.stringify({ ok: true, mode: 'insert' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.trigger === 'meet_entry' && body.record) {
      const record = body.record as MeetEntryRow;
      const oldRecord = (body.old_record ?? null) as MeetEntryRow | null;
      const { data: athlete } = await supabase.from('profiles').select('full_name, event_group').eq('id', record.athlete_id).single();
      await checkMeetEntryEvent(record, oldRecord, athlete?.full_name ?? 'Athlete', athlete?.event_group ?? null);

      return new Response(JSON.stringify({ ok: true, mode: 'meet_entry' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Weekly cron sweep: missing logs + qualifying risk + anomalies, per programme.
    const { data: programmes } = await supabase.from('programmes').select('id');
    for (const programme of programmes ?? []) {
      await checkMissingLogsForProgramme(programme.id);

      const { data: athletes } = await supabase
        .from('profiles')
        .select('id, full_name, qualifying_standard, event_group')
        .eq('programme_id', programme.id)
        .eq('role', 'athlete');
      for (const athlete of athletes ?? []) {
        await checkAnomaly(athlete.id, programme.id, athlete.full_name);
        await checkQualifyingRisk(athlete.id, programme.id, athlete.full_name, athlete.qualifying_standard, athlete.event_group);
      }
    }

    return new Response(JSON.stringify({ ok: true, mode: 'cron' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
