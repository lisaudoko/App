-- Mirrors missing_log_dismissals (20260101000023) for the Squad screen's "Alerts" bucket —
-- lets a coach dismiss an athlete from that list the same tap-to-dismiss way. Kept as its own
-- table rather than folding into missing_log_dismissals: the two buckets overlap (a "no log"
-- row shows in both) but aren't the same concept, and Alerts also covers real anomaly flags
-- that Missing never does, so dismissing one bucket must not affect the other.
create table alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles (id) on delete cascade,
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  week_number int not null,
  dismissed_at timestamptz not null default now(),
  unique (coach_id, athlete_id, week_number)
);

create index alert_dismissals_lookup_idx on alert_dismissals (coach_id, week_number);

alter table alert_dismissals enable row level security;

create policy "coaches manage own alert dismissals"
  on alert_dismissals for all
  using (coach_id = auth.uid() and auth_role() = 'coach')
  with check (coach_id = auth.uid() and auth_role() = 'coach');
