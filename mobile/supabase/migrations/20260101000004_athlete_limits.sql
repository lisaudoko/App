-- Server-side athlete-limit checks, callable by both signed-in coaches and
-- prospective athletes mid-signup (before they have a session), without
-- exposing raw subscription/billing rows via broad RLS.

create or replace function programme_athlete_count(target_programme_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from profiles where programme_id = target_programme_id and role = 'athlete';
$$;

create or replace function programme_athlete_limit(target_programme_id uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  coach_id_var uuid;
  exempt boolean;
  sub_status text;
  sub_tier text;
  trial_started timestamptz;
begin
  select p.id, p.subscription_exempt, p.trial_started_at
    into coach_id_var, exempt, trial_started
    from profiles p
    where p.programme_id = target_programme_id and p.role = 'coach'
    limit 1;

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

grant execute on function programme_athlete_count(uuid) to anon, authenticated;
grant execute on function programme_athlete_limit(uuid) to anon, authenticated;
