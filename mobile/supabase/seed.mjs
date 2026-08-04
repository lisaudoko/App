// Seeds one demo programme with a coach + 6 anonymised athletes.
// Run with: node --env-file=.env supabase/seed.mjs
// Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment. Safe to re-run — upserts everything by natural key.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  console.error('Run as: node --env-file=.env supabase/seed.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROGRAMME_NAME = 'Throwers Academy';
const PROGRAMME_JOIN_CODE = 'THROWERS1';
const DEMO_PASSWORD = 'TruDemo!2026';

const WEEK_STARTS = [
  '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29',
  '2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27',
];

const STRENGTH_DATES = ['2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15'];

const COACH = { email: 'coach@tru-demo.app', fullName: 'Programme Coach' };

const ATHLETES = [
  {
    key: 'a',
    email: 'athlete-a@tru-demo.app',
    fullName: 'Athlete A',
    event: 'Shot Put',
    baseline: 15.8,
    standard: 17.0,
    throws: [15.8, 15.95, 16.05, 16.15, 16.2, 16.3, 16.35, 16.4],
    rpe: [5, 6, 7, 8, 6, 7, 7, 7],
    sleep: [7, 7, 6, 7, 8, 7, 7, 8],
    soreness: [4, 5, 4, 5, 3, 4, 4, 3],
    energy: [7, 6, 7, 6, 8, 7, 7, 8],
    notes: ['Felt strong off the ring', null, 'Good tempo', 'Grip felt tight', null, 'Solid week', null, 'Best technical session yet'],
    strength: { squat: [140, 145, 150, 155], bench: [100, 103, 107, 110], clean: [95, 98, 101, 105], deadlift: [170, 178, 184, 190] },
  },
  {
    key: 'b',
    email: 'athlete-b@tru-demo.app',
    fullName: 'Athlete B',
    event: 'Discus',
    baseline: 43.0,
    standard: 46.0,
    throws: [43.0, 43.2, 43.4, 43.6, 43.9, 44.1, 44.3, 44.5],
    rpe: [6, 5, 6, 7, 7, 6, 7, 6],
    sleep: [7, 8, 7, 6, 7, 7, 8, 7],
    soreness: [3, 3, 4, 5, 4, 3, 4, 3],
    energy: [7, 7, 6, 7, 7, 8, 7, 7],
    notes: [null, 'Working on entry speed', null, 'Slight hamstring tightness', null, null, 'PB attempt close', null],
    strength: { squat: [120, 124, 127, 130], bench: [85, 87, 90, 92], clean: [80, 83, 86, 88], deadlift: [150, 155, 160, 165] },
  },
  {
    key: 'c',
    email: 'athlete-c@tru-demo.app',
    fullName: 'Athlete C',
    event: 'Discus',
    baseline: 41.0,
    standard: 46.0,
    // Deliberately flat throws in the back half despite rising strength —
    // exercises the "strength up >10%, throws flat 3+ weeks" anomaly check.
    throws: [41.0, 41.3, 41.5, 41.6, 41.6, 41.6, 41.6, 41.6],
    rpe: [5, 5, 6, 5, 5, 5, 5, 5],
    sleep: [7, 7, 7, 6, 6, 7, 6, 7],
    soreness: [4, 4, 4, 5, 5, 5, 5, 5],
    energy: [6, 6, 6, 6, 5, 6, 5, 6],
    notes: [null, null, 'Technique feels off in the middle', null, 'Plateaued — reviewing footage', null, null, 'Still flat, adjusting drill focus'],
    strength: { squat: [90, 95, 99, 102], bench: [65, 68, 70, 72], clean: [60, 63, 65, 66], deadlift: [115, 121, 125, 128] },
  },
  {
    key: 'd',
    email: 'athlete-d@tru-demo.app',
    fullName: 'Athlete D',
    event: 'Shot Put',
    baseline: 14.2,
    standard: 17.0,
    // 2 missing logs (weeks 5 and 6) per spec.
    throws: [14.2, 14.4, 14.6, 14.8, null, null, 15.1, 15.3],
    rpe: [7, 6, 8, 7, null, null, 8, 7],
    sleep: [6, 7, 6, 7, null, null, 7, 7],
    soreness: [5, 5, 6, 5, null, null, 5, 4],
    energy: [6, 6, 5, 6, null, null, 6, 7],
    notes: ['Building consistency', null, 'Heavy legs today', null, null, null, 'Back after a break', 'Good rhythm'],
    strength: { squat: [95, 99, 104, 108], bench: [68, 71, 75, 78], clean: [62, 65, 69, 72], deadlift: [120, 127, 133, 138] },
  },
  {
    key: 'e',
    email: 'athlete-e@tru-demo.app',
    fullName: 'Athlete E',
    event: 'Hammer',
    baseline: 50.1,
    standard: 55.0,
    // RPE creeps above 8 for 3 straight weeks — exercises the high-RPE push.
    throws: [50.1, 50.5, 51.0, 51.5, 51.8, 52.0, 52.2, 52.4],
    rpe: [6, 7, 7, 8, 8, 9, 9, 9],
    sleep: [7, 7, 6, 6, 6, 5, 6, 5],
    soreness: [4, 5, 5, 6, 6, 7, 7, 7],
    energy: [7, 7, 6, 6, 6, 5, 5, 5],
    notes: [null, null, 'Grip strength improving', 'Load feels heavy', null, 'Fatigued but pushing through', null, 'Coach flagged for a deload'],
    strength: { squat: [150, 156, 162, 168], bench: [110, 113, 117, 122], clean: [100, 104, 108, 112], deadlift: [185, 192, 199, 205] },
  },
  {
    key: 'f',
    email: 'athlete-f@tru-demo.app',
    fullName: 'Athlete F',
    event: 'Javelin',
    baseline: 37.2,
    standard: 42.0,
    throws: [37.2, 37.5, 37.7, 37.9, 38.1, 38.3, 38.6, 38.8],
    rpe: [5, 6, 6, 7, 6, 6, 7, 7],
    sleep: [8, 7, 8, 7, 7, 8, 7, 7],
    soreness: [3, 3, 4, 4, 3, 4, 4, 3],
    energy: [8, 7, 7, 7, 8, 7, 7, 8],
    notes: [null, 'Approach run cleaned up', null, null, 'Block felt more stable', null, null, 'Consistent block week'],
    strength: { squat: [100, 103, 107, 112], bench: [72, 74, 77, 80], clean: [68, 71, 73, 76], deadlift: [130, 135, 140, 145] },
  },
];

// 8-week block: a deload in week 5, building intensity otherwise.
const WORKOUT_WEEKS = [
  { intensity: 0.75, scheme: { sets: 5, reps: 5 } },
  { intensity: 0.78, scheme: { sets: 5, reps: 5 } },
  { intensity: 0.8, scheme: { sets: 4, reps: 4 } },
  { intensity: 0.85, scheme: { sets: 4, reps: 3 } },
  { intensity: 0.7, scheme: { sets: 3, reps: 5 } },
  { intensity: 0.82, scheme: { sets: 4, reps: 4 } },
  { intensity: 0.85, scheme: { sets: 3, reps: 3 } },
  { intensity: 0.9, scheme: { sets: 3, reps: 2 } },
];

function buildExercises({ sets, reps }) {
  return [
    { name: 'Back Squat', sets, reps, lift: 'squat' },
    { name: 'Power Clean', sets, reps: Math.max(2, reps - 1), lift: 'clean' },
    { name: 'Bench Press', sets, reps: reps + 1, lift: 'bench' },
    { name: 'Deadlift', sets: Math.max(3, sets - 1), reps, lift: 'deadlift' },
    { name: 'Med Ball Rotational Throws', sets: 4, reps: 8, lift: null },
  ];
}

async function findUserByEmail(email) {
  // Small user base — a single page covers everyone.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureAuthUser(email, password) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  console.log(`Seeding programme "${PROGRAMME_NAME}"...`);

  const { data: programme, error: programmeError } = await supabase
    .from('programmes')
    .upsert({ name: PROGRAMME_NAME, join_code: PROGRAMME_JOIN_CODE }, { onConflict: 'join_code' })
    .select()
    .single();
  if (programmeError) throw programmeError;
  const programmeId = programme.id;
  console.log(`Programme id: ${programmeId} (join code: ${PROGRAMME_JOIN_CODE})`);

  const coachUser = await ensureAuthUser(COACH.email, DEMO_PASSWORD);
  const { error: coachProfileError } = await supabase.from('profiles').upsert({
    id: coachUser.id,
    programme_id: programmeId,
    role: 'coach',
    full_name: COACH.fullName,
  });
  if (coachProfileError) throw coachProfileError;
  console.log(`Coach ready: ${COACH.email} / ${DEMO_PASSWORD}`);

  for (const athlete of ATHLETES) {
    const user = await ensureAuthUser(athlete.email, DEMO_PASSWORD);

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      programme_id: programmeId,
      role: 'athlete',
      full_name: athlete.fullName,
      event: athlete.event,
      baseline_distance: athlete.baseline,
      qualifying_standard: athlete.standard,
      qualifying_event: athlete.event,
    });
    if (profileError) throw profileError;

    const weeklyRows = WEEK_STARTS.map((weekStart, i) => ({
      athlete_id: user.id,
      programme_id: programmeId,
      week_number: i + 1,
      week_start: weekStart,
      best_throw: athlete.throws[i],
      rpe: athlete.rpe[i],
      sleep_score: athlete.sleep[i],
      soreness_score: athlete.soreness[i],
      energy_score: athlete.energy[i],
      notes: athlete.notes[i],
    })).filter((row) => row.best_throw !== null || row.rpe !== null);

    const { error: weeklyError } = await supabase
      .from('weekly_logs')
      .upsert(weeklyRows, { onConflict: 'athlete_id,week_number' });
    if (weeklyError) throw weeklyError;

    const strengthRows = STRENGTH_DATES.map((loggedAt, i) => ({
      athlete_id: user.id,
      programme_id: programmeId,
      logged_at: loggedAt,
      squat_1rm: athlete.strength.squat[i],
      bench_1rm: athlete.strength.bench[i],
      clean_1rm: athlete.strength.clean[i],
      deadlift_1rm: athlete.strength.deadlift[i],
    }));

    const { error: strengthError } = await supabase
      .from('strength_logs')
      .upsert(strengthRows, { onConflict: 'athlete_id,logged_at' });
    if (strengthError) throw strengthError;

    console.log(`Athlete ready: ${athlete.email} / ${DEMO_PASSWORD} (${athlete.event})`);
  }

  const workoutRows = WORKOUT_WEEKS.map((week, i) => ({
    programme_id: programmeId,
    week_number: i + 1,
    intensity_pct: week.intensity,
    exercises: buildExercises(week.scheme),
  }));
  const { error: workoutsError } = await supabase
    .from('workouts')
    .upsert(workoutRows, { onConflict: 'programme_id,week_number' });
  if (workoutsError) throw workoutsError;
  console.log(`Workouts seeded for weeks 1-${WORKOUT_WEEKS.length}.`);

  console.log('\nSeed complete.');
  console.log(`All demo accounts share password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
