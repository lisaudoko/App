-- TRU Performance — foundation schema
-- Tables, RLS policies, and triggers per the Prompt 1 spec.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- programmes
-- ---------------------------------------------------------------------------
create table programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Extension beyond the spec's minimum columns: lets an athlete self-signup
  -- into the right programme without a coach manually provisioning accounts.
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  programme_id uuid references programmes (id) on delete set null,
  role text not null check (role in ('coach', 'athlete')),
  full_name text not null,
  event text,
  expo_push_token text,
  baseline_distance decimal,
  qualifying_standard decimal,
  qualifying_event text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- weekly_logs
-- ---------------------------------------------------------------------------
create table weekly_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  week_number int not null,
  week_start date not null,
  best_throw decimal,
  rpe int check (rpe between 1 and 10),
  sleep_score int check (sleep_score between 1 and 10),
  soreness_score int check (soreness_score between 1 and 10),
  energy_score int check (energy_score between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  unique (athlete_id, week_number)
);

create index weekly_logs_athlete_idx on weekly_logs (athlete_id, week_number);
create index weekly_logs_programme_idx on weekly_logs (programme_id);

-- ---------------------------------------------------------------------------
-- strength_logs
-- ---------------------------------------------------------------------------
create table strength_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  logged_at date not null,
  squat_1rm decimal,
  bench_1rm decimal,
  clean_1rm decimal,
  deadlift_1rm decimal,
  created_at timestamptz not null default now(),
  unique (athlete_id, logged_at)
);

create index strength_logs_athlete_idx on strength_logs (athlete_id, logged_at);
create index strength_logs_programme_idx on strength_logs (programme_id);

-- ---------------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------------
create table workouts (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade,
  week_number int not null,
  intensity_pct decimal,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (programme_id, week_number)
);

create index workouts_programme_idx on workouts (programme_id);

-- ---------------------------------------------------------------------------
-- notifications_log
-- ---------------------------------------------------------------------------
create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  type text not null check (type in ('pb', 'missing_log', 'high_rpe', 'anomaly', 'qualifying_risk')),
  message text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_log_athlete_idx on notifications_log (athlete_id, sent_at desc);
create index notifications_log_programme_idx on notifications_log (programme_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create or replace function auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_programme_id() returns uuid
language sql stable security definer set search_path = public as $$
  select programme_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table programmes enable row level security;
alter table profiles enable row level security;
alter table weekly_logs enable row level security;
alter table strength_logs enable row level security;
alter table workouts enable row level security;
alter table notifications_log enable row level security;

-- programmes: any authenticated user can read their own programme; also
-- allow reading by join_code (unauthenticated is not possible under RLS, so
-- signup instead resolves join_code -> programme_id via a SECURITY DEFINER
-- RPC — see below).
create policy "programme members can read their programme"
  on programmes for select
  using (id = auth_programme_id());

-- Signup needs to create a brand-new programme before the coach's profile
-- (and therefore auth_programme_id()) exists — any authenticated user may
-- create one; in practice this only happens once, at coach signup.
create policy "authenticated users can create a programme"
  on programmes for insert
  to authenticated
  with check (true);

-- profiles: athletes read/write their own row.
create policy "athletes read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "athletes update own profile"
  on profiles for update
  using (id = auth.uid());

create policy "users insert own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "users delete own profile"
  on profiles for delete
  using (id = auth.uid());

-- profiles: coaches read every profile in their programme (athletes + self).
create policy "coaches read programme profiles"
  on profiles for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- weekly_logs: athletes read/write their own rows.
create policy "athletes read own weekly_logs"
  on weekly_logs for select
  using (athlete_id = auth.uid());

create policy "athletes write own weekly_logs"
  on weekly_logs for insert
  with check (athlete_id = auth.uid() and programme_id = auth_programme_id());

create policy "athletes update own weekly_logs"
  on weekly_logs for update
  using (athlete_id = auth.uid());

create policy "athletes delete own weekly_logs"
  on weekly_logs for delete
  using (athlete_id = auth.uid());

-- weekly_logs: coaches read all rows in their programme.
create policy "coaches read programme weekly_logs"
  on weekly_logs for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- strength_logs: athletes read/write their own rows.
create policy "athletes read own strength_logs"
  on strength_logs for select
  using (athlete_id = auth.uid());

create policy "athletes write own strength_logs"
  on strength_logs for insert
  with check (athlete_id = auth.uid() and programme_id = auth_programme_id());

create policy "athletes update own strength_logs"
  on strength_logs for update
  using (athlete_id = auth.uid());

create policy "athletes delete own strength_logs"
  on strength_logs for delete
  using (athlete_id = auth.uid());

-- strength_logs: coaches read all rows in their programme.
create policy "coaches read programme strength_logs"
  on strength_logs for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- workouts: everyone in the programme can read; only coaches can write.
create policy "programme members read workouts"
  on workouts for select
  using (programme_id = auth_programme_id());

create policy "coaches insert workouts"
  on workouts for insert
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches update workouts"
  on workouts for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches delete workouts"
  on workouts for delete
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- notifications_log: athletes read/update (mark read) their own notifications.
create policy "athletes read own notifications"
  on notifications_log for select
  using (athlete_id = auth.uid());

create policy "athletes mark own notifications read"
  on notifications_log for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- notifications_log: coaches read all notifications in their programme.
create policy "coaches read programme notifications"
  on notifications_log for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- notifications_log: only edge functions (service role, which bypasses RLS)
-- insert notifications — no client insert policy is defined on purpose.

-- ---------------------------------------------------------------------------
-- Signup helper: resolve a programme join_code to its id without exposing
-- the programmes table to unauthenticated/other-programme reads.
-- ---------------------------------------------------------------------------
create or replace function programme_id_for_join_code(code text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from programmes where join_code = upper(trim(code));
$$;

grant execute on function programme_id_for_join_code(text) to anon, authenticated;
