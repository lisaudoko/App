-- Prompt 7: Meet Day Notes. Extends the existing `meets` table (already used
-- for qualifying standards on the Standards tab) with meet-day fields rather
-- than replacing it, and adds `meet_entries` for per-athlete competition
-- tracking (attempts, coach observations).

alter table meets add column location text;
alter table meets add column meet_type text check (meet_type in ('qualifier', 'championship', 'invitational', 'dual_meet', 'time_trial'));
alter table meets add column conditions text;
alter table meets add column general_notes text;

create table meet_entries (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references meets (id) on delete cascade,
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  event text not null,
  bib_number text,
  seed_mark decimal,
  -- [{attempt:1, mark:16.4, wind:'+1.2', foul:false, notes:''}]
  attempts jsonb not null default '[]'::jsonb,
  final_mark decimal,
  place int,
  qualified boolean not null default false,
  coach_notes text,
  technical_cues text,
  next_steps text,
  created_at timestamptz not null default now(),
  unique (meet_id, athlete_id)
);

create index meet_entries_meet_idx on meet_entries (meet_id);
create index meet_entries_athlete_idx on meet_entries (athlete_id);
create index meet_entries_programme_idx on meet_entries (programme_id);

alter table meet_entries enable row level security;

-- Base table: coach-only. Athletes go through the restricted view below so
-- coach_notes/technical_cues/next_steps never reach an athlete's device.
create policy "coaches read programme meet_entries"
  on meet_entries for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches insert meet_entries"
  on meet_entries for insert
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches update meet_entries"
  on meet_entries for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches delete meet_entries"
  on meet_entries for delete
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- Athlete-facing view: same rows an athlete is entitled to, minus the
-- coach-private columns. Runs as the view owner (bypassing the coach-only
-- base-table RLS above by design) and enforces its own row filter instead.
create view meet_entries_athlete_view as
  select id, meet_id, athlete_id, programme_id, event, bib_number, seed_mark, attempts, final_mark, place, qualified, created_at
  from meet_entries
  where athlete_id = auth.uid()
     or (auth_role() = 'coach' and programme_id = auth_programme_id());

grant select on meet_entries_athlete_view to authenticated;
