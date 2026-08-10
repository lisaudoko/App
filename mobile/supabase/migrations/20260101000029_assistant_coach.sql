-- Assistant Coach role: shares the head coach's programme with restricted
-- permissions (no programme config, no billing, no invite/remove management,
-- no deleting athletes). Only ever created via the accept-coach-invite edge
-- function's service-role INSERT (never an UPDATE — profiles_prevent_role_
-- programme_change, added in 20260101000021, unconditionally blocks changing
-- role/programme_id on an existing row, for every caller including service
-- role, by design).

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('coach', 'assistant_coach', 'athlete'));

-- Identifies the head coach (owner) of each programme — the one profile
-- allowed to change programme config, manage invites, and view billing.
-- on delete set null (matching programmes.created_by's existing pattern)
-- rather than cascade: deleting the head coach's account shouldn't also
-- silently delete the whole programme out from under its athletes.
alter table programmes add column if not exists owner_id uuid references profiles (id) on delete set null;

update programmes p
set owner_id = (
  select id from profiles
  where programme_id = p.id and role = 'coach'
  limit 1
)
where owner_id is null;

-- ---------------------------------------------------------------------------
-- coach_invites — head-coach-only writes; the invitee (who has no account
-- yet) resolves a token via resolve_coach_invite() below instead of reading
-- this table directly, and acceptance happens through a service-role edge
-- function, so no anon/authenticated SELECT policy is needed at all.
-- ---------------------------------------------------------------------------
create table coach_invites (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade,
  invited_by uuid not null references profiles (id) on delete cascade,
  email text not null,
  invited_role text not null default 'assistant_coach' check (invited_role in ('athlete', 'assistant_coach')),
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  -- Links back to the profile the invite created, so the settings screen can show
  -- an assistant coach's invite email (not stored on profiles itself).
  accepted_by uuid references profiles (id) on delete cascade
);

create unique index coach_invites_token_idx on coach_invites (token);
create index coach_invites_programme_idx on coach_invites (programme_id);

alter table coach_invites enable row level security;

create policy "head coach manages own invites"
  on coach_invites for all
  using (auth_role() = 'coach' and programme_id = auth_programme_id())
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());

-- Lets the pre-signup invitee (no session yet) resolve a token to the
-- inviting programme's name + the email it was sent to, without exposing
-- coach_invites itself to anon/authenticated reads. Returns zero rows for an
-- invalid/already-accepted/revoked token.
create or replace function resolve_coach_invite(p_token uuid)
returns table (email text, programme_name text, invited_role text)
language sql stable security definer set search_path = public as $$
  select ci.email, p.name, ci.invited_role
  from coach_invites ci
  join programmes p on p.id = ci.programme_id
  where ci.token = p_token and ci.status = 'pending';
$$;

grant execute on function resolve_coach_invite(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: extend coach-only write/read policies to assistant_coach for
-- day-to-day squad work (workouts, meets, meet_entries, athlete_notes,
-- weekly/strength log reads, notifications, dismissals). Programme config,
-- programmes, coach_invites, and profiles role/programme changes stay
-- head-coach-only — left untouched below.
-- ---------------------------------------------------------------------------
create or replace function auth_is_coach_team() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('coach', 'assistant_coach');
$$;

-- profiles: assistant coaches can view (not manage) athlete profiles in
-- their programme — never the head coach's own row, so subscription_exempt/
-- trial_started_at/revenuecat_customer_id on that row stay invisible to them
-- (RLS is row-level, not column-level — restricting to role='athlete' target
-- rows is what actually prevents that leak, not a column grant).
create policy "assistant coaches read programme athlete profiles"
  on profiles for select
  using (auth_role() = 'assistant_coach' and programme_id = auth_programme_id() and role = 'athlete');

-- profiles: broaden athlete-profile edits (status/group/class/etc, not
-- role/programme_id — those stay immutable regardless) to assistant coaches,
-- same row restriction as above so they can never touch the head coach's own
-- profile row via this policy.
drop policy "coaches update programme profiles" on profiles;
create policy "coach team updates programme profiles"
  on profiles for update
  using (
    programme_id = auth_programme_id()
    and (auth_role() = 'coach' or (auth_role() = 'assistant_coach' and role = 'athlete'))
  )
  with check (
    programme_id = auth_programme_id()
    and (auth_role() = 'coach' or (auth_role() = 'assistant_coach' and role = 'athlete'))
  );

-- workouts
drop policy "coaches insert workouts" on workouts;
create policy "coach team insert workouts"
  on workouts for insert
  with check (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches update workouts" on workouts;
create policy "coach team update workouts"
  on workouts for update
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches delete workouts" on workouts;
create policy "coach team delete workouts"
  on workouts for delete
  using (auth_is_coach_team() and programme_id = auth_programme_id());

-- notifications_log
drop policy "coaches read programme notifications" on notifications_log;
create policy "coach team read programme notifications"
  on notifications_log for select
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches mark programme notifications read" on notifications_log;
create policy "coach team mark programme notifications read"
  on notifications_log for update
  using (auth_is_coach_team() and programme_id = auth_programme_id())
  with check (auth_is_coach_team() and programme_id = auth_programme_id());

-- weekly_logs (read only — coaches never write these)
drop policy "coaches read programme weekly_logs" on weekly_logs;
create policy "coach team read programme weekly_logs"
  on weekly_logs for select
  using (auth_is_coach_team() and programme_id = auth_programme_id());

-- strength_logs
drop policy "coaches read programme strength_logs" on strength_logs;
create policy "coach team read programme strength_logs"
  on strength_logs for select
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches write programme strength_logs" on strength_logs;
create policy "coach team write programme strength_logs"
  on strength_logs for insert
  with check (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches update programme strength_logs" on strength_logs;
create policy "coach team update programme strength_logs"
  on strength_logs for update
  using (auth_is_coach_team() and programme_id = auth_programme_id());

-- meets
drop policy "coaches insert meets" on meets;
create policy "coach team insert meets"
  on meets for insert
  with check (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches update meets" on meets;
create policy "coach team update meets"
  on meets for update
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches delete meets" on meets;
create policy "coach team delete meets"
  on meets for delete
  using (auth_is_coach_team() and programme_id = auth_programme_id());

-- meet_entries (base table stays restricted to the coach team; athletes
-- still go through meet_entries_athlete_view)
drop policy "coaches read programme meet_entries" on meet_entries;
create policy "coach team read programme meet_entries"
  on meet_entries for select
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches insert meet_entries" on meet_entries;
create policy "coach team insert meet_entries"
  on meet_entries for insert
  with check (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches update meet_entries" on meet_entries;
create policy "coach team update meet_entries"
  on meet_entries for update
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches delete meet_entries" on meet_entries;
create policy "coach team delete meet_entries"
  on meet_entries for delete
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop view if exists meet_entries_athlete_view;
create view meet_entries_athlete_view as
  select id, meet_id, athlete_id, programme_id, event, bib_number, seed_mark, attempts, final_mark, place, qualified, created_at
  from meet_entries
  where athlete_id = auth.uid()
     or (auth_is_coach_team() and programme_id = auth_programme_id());

grant select on meet_entries_athlete_view to authenticated;

-- athlete_notes (insert still requires coach_id = auth.uid() — attributed to
-- whichever coach-team member actually wrote it, unchanged)
drop policy "coaches read programme athlete_notes" on athlete_notes;
create policy "coach team read programme athlete_notes"
  on athlete_notes for select
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches insert athlete_notes" on athlete_notes;
create policy "coach team insert athlete_notes"
  on athlete_notes for insert
  with check (auth_is_coach_team() and programme_id = auth_programme_id() and coach_id = auth.uid());

drop policy "coaches update athlete_notes" on athlete_notes;
create policy "coach team update athlete_notes"
  on athlete_notes for update
  using (auth_is_coach_team() and programme_id = auth_programme_id());

drop policy "coaches delete athlete_notes" on athlete_notes;
create policy "coach team delete athlete_notes"
  on athlete_notes for delete
  using (auth_is_coach_team() and programme_id = auth_programme_id());

-- workout_completions (read only — athletes write their own)
drop policy "coaches read programme workout_completions" on workout_completions;
create policy "coach team read programme workout_completions"
  on workout_completions for select
  using (auth_is_coach_team() and programme_id = auth_programme_id());

-- missing_log_dismissals / alert_dismissals (still scoped to the acting
-- user's own dismissals via coach_id = auth.uid(), just role-broadened)
drop policy "coaches manage own dismissals" on missing_log_dismissals;
create policy "coach team manage own dismissals"
  on missing_log_dismissals for all
  using (coach_id = auth.uid() and auth_is_coach_team())
  with check (coach_id = auth.uid() and auth_is_coach_team());

drop policy "coaches manage own alert dismissals" on alert_dismissals;
create policy "coach team manage own alert dismissals"
  on alert_dismissals for all
  using (coach_id = auth.uid() and auth_is_coach_team())
  with check (coach_id = auth.uid() and auth_is_coach_team());

-- ---------------------------------------------------------------------------
-- Left untouched on purpose (head-coach-only): programmes, programme_config,
-- coach_invites, subscriptions, and the profiles role/programme_id columns
-- (immutable via trigger regardless of RLS).
-- ---------------------------------------------------------------------------

-- Harden the athlete-limit lookup to resolve the billing owner via
-- programmes.owner_id now that it exists, instead of guessing "the one
-- role='coach' row" — falls back to the old guess if owner_id is somehow
-- unset (defensive only; the backfill above should leave no such row).
create or replace function programme_athlete_limit(target_programme_id uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  coach_id_var uuid;
  exempt boolean;
  sub_status text;
  sub_tier text;
  trial_started timestamptz;
begin
  select owner_id into coach_id_var from programmes where id = target_programme_id;

  if coach_id_var is null then
    select id into coach_id_var from profiles
    where programme_id = target_programme_id and role = 'coach'
    limit 1;
  end if;

  select subscription_exempt, trial_started_at into exempt, trial_started
  from profiles where id = coach_id_var;

  if exempt then
    return 2147483647;
  end if;

  select status, tier into sub_status, sub_tier from subscriptions where coach_id = coach_id_var;

  if sub_status = 'active' then
    return case sub_tier
      when 'starter' then 10
      when 'growth' then 25
      else 2147483647
    end;
  end if;

  if sub_status = 'trialing' or (trial_started is not null and now() < trial_started + interval '30 days') then
    return 2147483647;
  end if;

  return 0;
end;
$$;
