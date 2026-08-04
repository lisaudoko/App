-- Prompt 8: Athlete Notes. A coaching diary, separate from meet entries
-- (competition-day observations) and weekly logs (athlete-submitted data).
-- Coach-private end to end: unlike meet_entries there is no athlete-facing
-- view here at all — athletes have no read access to this table.

create table athlete_notes (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade,
  athlete_id uuid not null references profiles (id) on delete cascade,
  coach_id uuid not null references profiles (id) on delete cascade,
  note_date date not null default current_date,
  note_type text not null check (note_type in ('general', 'injury', 'technical', 'mindset', 'admin')),
  body text not null,
  flag_followup boolean not null default false,
  created_at timestamptz not null default now()
);

create index athlete_notes_athlete_idx on athlete_notes (athlete_id);
create index athlete_notes_programme_idx on athlete_notes (programme_id);
create index athlete_notes_flag_idx on athlete_notes (athlete_id, flag_followup) where flag_followup;

alter table athlete_notes enable row level security;

create policy "coaches read programme athlete_notes"
  on athlete_notes for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches insert athlete_notes"
  on athlete_notes for insert
  with check (auth_role() = 'coach' and programme_id = auth_programme_id() and coach_id = auth.uid());

create policy "coaches update athlete_notes"
  on athlete_notes for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

create policy "coaches delete athlete_notes"
  on athlete_notes for delete
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

-- No policy grants athletes any access — RLS defaults to deny, so
-- athlete_id = auth.uid() rows are still invisible to that athlete.
