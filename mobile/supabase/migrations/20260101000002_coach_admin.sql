-- Coach admin surface: meets/schedule, athlete grouping, coach-entered
-- athlete stats/profile edits, and configurable workout weight rounding.

-- ---------------------------------------------------------------------------
-- meets (competition schedule + per-event qualifying standards)
-- ---------------------------------------------------------------------------
create table meets (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade,
  name text not null,
  date date not null,
  -- {"Shot Put": 17.0, "Discus": 46.0, ...}
  standards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index meets_programme_idx on meets (programme_id, date);

alter table meets enable row level security;

create policy "programme members read meets"
  on meets for select
  using (programme_id = auth_programme_id());

create policy "coaches insert meets"
  on meets for insert
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches update meets"
  on meets for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches delete meets"
  on meets for delete
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- ---------------------------------------------------------------------------
-- profiles: athlete classification/grouping (coach-assigned, e.g. "Varsity",
-- "U18", separate from event)
-- ---------------------------------------------------------------------------
alter table profiles add column group_name text;

-- Coaches can edit athlete profiles in their own programme (previously
-- read-only) — qualifying standard/event, group, baseline mark, etc.
create policy "coaches update programme profiles"
  on profiles for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id())
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

-- ---------------------------------------------------------------------------
-- strength_logs: coaches can also enter stats on an athlete's behalf
-- ---------------------------------------------------------------------------
create policy "coaches write programme strength_logs"
  on strength_logs for insert
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches update programme strength_logs"
  on strength_logs for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- ---------------------------------------------------------------------------
-- workouts: configurable weight-rounding increment (e.g. nearest 5 vs 2.5)
-- ---------------------------------------------------------------------------
alter table workouts add column rounding_increment numeric not null default 5;
