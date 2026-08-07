-- Athletes previously had per-exercise "done" checkmarks that only ever
-- lived in local AsyncStorage (src/data/repository.ts's now-removed
-- WORKOUT_PROGRESS_KEY) — nothing ever reached the coach. This adds a real,
-- synced completion record plus an explicit "submit to coach" action.

create table workout_completions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  week_number int not null,
  completed_exercise_ids jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, week_number)
);

create index workout_completions_athlete_idx on workout_completions (athlete_id, week_number);
create index workout_completions_programme_idx on workout_completions (programme_id);

alter table workout_completions enable row level security;

-- Athletes manage their own checklist state directly (no edge function
-- needed for per-exercise toggles — only the final "submit" notification
-- goes through one, since notifications_log has no client insert policy).
create policy "athletes read own workout_completions"
  on workout_completions for select
  using (athlete_id = auth.uid());

create policy "athletes insert own workout_completions"
  on workout_completions for insert
  with check (athlete_id = auth.uid());

create policy "athletes update own workout_completions"
  on workout_completions for update
  using (athlete_id = auth.uid());

create policy "coaches read programme workout_completions"
  on workout_completions for select
  using (auth_role() = 'coach' and programme_id = auth_programme_id());

alter table notifications_log drop constraint notifications_log_type_check;
alter table notifications_log add constraint notifications_log_type_check
  check (type in ('pb', 'missing_log', 'high_rpe', 'anomaly', 'qualifying_risk', 'meet_pb', 'meet_qualified', 'broadcast', 'workout_complete'));

-- Atomic add/remove of one exercise id in completed_exercise_ids. A plain
-- client-side read-modify-write (read the array, toggle, write it back) has
-- a race: two exercises toggled in quick succession can both read the same
-- stale snapshot and the second write silently clobbers the first. `select
-- ... for update` takes a row lock for the duration of this call, so
-- concurrent toggles for the same athlete+week serialize instead of racing.
-- security invoker (not definer) — relies on the athlete's own RLS grants
-- above, doesn't need to bypass them.
create or replace function toggle_workout_exercise(p_week_number int, p_exercise_id text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing jsonb;
  without_id jsonb;
  result jsonb;
begin
  insert into workout_completions (athlete_id, programme_id, week_number, completed_exercise_ids, updated_at)
  values (auth.uid(), auth_programme_id(), p_week_number, '[]'::jsonb, now())
  on conflict (athlete_id, week_number) do nothing;

  select completed_exercise_ids into existing
  from workout_completions
  where athlete_id = auth.uid() and week_number = p_week_number
  for update;

  select coalesce(jsonb_agg(e), '[]'::jsonb) into without_id
  from jsonb_array_elements(existing) e
  where e <> to_jsonb(p_exercise_id);

  if jsonb_array_length(without_id) = jsonb_array_length(existing) then
    result := existing || jsonb_build_array(p_exercise_id);
  else
    result := without_id;
  end if;

  update workout_completions
  set completed_exercise_ids = result, updated_at = now()
  where athlete_id = auth.uid() and week_number = p_week_number;

  return result;
end;
$$;

grant execute on function toggle_workout_exercise(int, text) to authenticated;
