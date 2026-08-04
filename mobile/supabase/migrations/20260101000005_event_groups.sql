-- Multi-sport support: throws (existing), sprints, jumps. A programme picks
-- one or more event groups at onboarding; athletes belong to exactly one.

alter table programmes add column event_groups text[] not null default '{}';

alter table profiles add column event_group text check (event_group in ('throws', 'sprints', 'jumps'));

-- Generic performance value replacing the throws-only best_throw. best_throw
-- stays for backwards compatibility (existing rows, existing chart code
-- mid-migration) — new writes go through best_performance/performance_unit.
alter table weekly_logs add column best_performance decimal;
alter table weekly_logs add column performance_unit text check (performance_unit in ('metres', 'seconds'));

create table programme_config (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade unique,
  throws_config jsonb,
  sprints_config jsonb,
  jumps_config jsonb,
  -- {"Shot Put": 17.0, "100m": 10.9, ...}
  qualifying_standards jsonb not null default '{}'::jsonb,
  competition_date date,
  updated_at timestamptz not null default now()
);

alter table programme_config enable row level security;

create policy "programme members read config"
  on programme_config for select
  using (programme_id = auth_programme_id());

create policy "coaches insert config"
  on programme_config for insert
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches update config"
  on programme_config for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- --- Backfill: everything before this migration was throws-only. ---

update programmes
set event_groups = array['throws']
where event_groups = '{}'
  and id in (select distinct programme_id from weekly_logs);

update profiles
set event_group = 'throws'
where role = 'athlete' and event_group is null and programme_id is not null;

update weekly_logs
set best_performance = best_throw, performance_unit = 'metres'
where best_performance is null and best_throw is not null;
