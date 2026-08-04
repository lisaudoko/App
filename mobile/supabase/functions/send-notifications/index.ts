// Fires on weekly_logs insert (via DB trigger, see
// supabase/migrations/20260101000001_notification_wiring.sql) and on a
// weekly pg_cron sweep. Runs as the service role — bypasses RLS by design,
// since this is invoked by Postgres/cron, not a signed-in user.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Expo } from 'npm:expo-server-sdk@3';
import { corsHeaders } from '../_shared/cors.ts';
import { projectToWeek } from '../_shared/projections.ts';

const HIGH_RPE_THRESHOLD = 8;
const STRENGTH_INCREASE_THRESHOLD = 0.1; // 10%
const FLAT_THROW_WEEKS = 3;
const FLAT_THROW_RANGE_M = 0.3;
const QUALIFYING_HORIZON_WEEKS = 4;

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const expo = new Expo();

type NotificationType = 'pb' | 'missing_log' | 'high_rpe' | 'anomaly' | 'qualifying_risk';

interface WeeklyLogRow {
  id: string;
  athlete_id: string;
  programme_id: string;
  week_number: number;
  best_throw: number | null;
  rpe: number | null;
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

async function checkNewPB(row: WeeklyLogRow, athleteName: string) {
  if (row.best_throw == null) return;
  const { data: priorLogs } = await supabase
    .from('weekly_logs')
    .select('best_throw')
    .eq('athlete_id', row.athlete_id)
    .lt('week_number', row.week_number)
    .not('best_throw', 'is', null);
  const priorMax = (priorLogs ?? []).reduce((max, l) => Math.max(max, l.best_throw as number), -Infinity);
  if (priorLogs && priorLogs.length > 0 && row.best_throw > priorMax) {
    const message = `New PB — ${athleteName}: ${row.best_throw}m (was ${priorMax}m)`;
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
    .select('best_throw')
    .eq('athlete_id', athleteId)
    .not('best_throw', 'is', null)
    .order('week_number', { ascending: false })
    .limit(FLAT_THROW_WEEKS);
  if (!recentLogs || recentLogs.length < FLAT_THROW_WEEKS) return;

  const marks = recentLogs.map((l) => l.best_throw as number);
  const range = Math.max(...marks) - Math.min(...marks);
  if (range > FLAT_THROW_RANGE_M) return;

  const message = `${athleteName}: strength up >10% but throws flat for ${FLAT_THROW_WEEKS}+ weeks — possible technique regression`;
  await log(athleteId, programmeId, 'anomaly', message, false, true, '', `Anomaly — ${athleteName}`);
}

async function checkQualifyingRisk(
  athleteId: string,
  programmeId: string,
  athleteName: string,
  qualifyingStandard: number | null,
) {
  if (qualifyingStandard == null) return;
  const { data: logs } = await supabase
    .from('weekly_logs')
    .select('week_number, best_throw')
    .eq('athlete_id', athleteId)
    .order('week_number', { ascending: true });
  if (!logs || logs.length === 0) return;

  const lastWeek = logs[logs.length - 1].week_number;
  const projection = projectToWeek(logs, lastWeek + QUALIFYING_HORIZON_WEEKS);
  if (!projection) return;

  if (projection.projected < qualifyingStandard) {
    const message = `${athleteName}: projected ${projection.projected.toFixed(2)}m vs standard ${qualifyingStandard}m — qualifying at risk`;
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
        .select('full_name, qualifying_standard')
        .eq('id', row.athlete_id)
        .single();
      const athleteName = athlete?.full_name ?? 'Athlete';

      await checkNewPB(row, athleteName);
      await checkHighRpe(row, athleteName);
      await checkAnomaly(row.athlete_id, row.programme_id, athleteName);
      await checkQualifyingRisk(row.athlete_id, row.programme_id, athleteName, athlete?.qualifying_standard ?? null);

      return new Response(JSON.stringify({ ok: true, mode: 'insert' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Weekly cron sweep: missing logs + qualifying risk + anomalies, per programme.
    const { data: programmes } = await supabase.from('programmes').select('id');
    for (const programme of programmes ?? []) {
      await checkMissingLogsForProgramme(programme.id);

      const { data: athletes } = await supabase
        .from('profiles')
        .select('id, full_name, qualifying_standard')
        .eq('programme_id', programme.id)
        .eq('role', 'athlete');
      for (const athlete of athletes ?? []) {
        await checkAnomaly(athlete.id, programme.id, athlete.full_name);
        await checkQualifyingRisk(athlete.id, programme.id, athlete.full_name, athlete.qualifying_standard);
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
