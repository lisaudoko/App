-- Lets a coach dismiss an athlete from the "Missing this week" list, notification-style
-- (tap-to-dismiss, not a real swipe gesture — no swipe-list pattern exists anywhere in
-- this app yet). Scoped per week_number, so a new week always starts with zero
-- dismissals — nothing needs to "reset," it's just a fresh key with no rows yet.
create table missing_log_dismissals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles (id) on delete cascade,
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  week_number int not null,
  dismissed_at timestamptz not null default now(),
  unique (coach_id, athlete_id, week_number)
);

create index missing_log_dismissals_lookup_idx on missing_log_dismissals (coach_id, week_number);

alter table missing_log_dismissals enable row level security;

create policy "coaches manage own dismissals"
  on missing_log_dismissals for all
  using (coach_id = auth.uid() and auth_role() = 'coach')
  with check (coach_id = auth.uid() and auth_role() = 'coach');
