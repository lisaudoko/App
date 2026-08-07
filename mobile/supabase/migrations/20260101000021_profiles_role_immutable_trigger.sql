-- Follow-up to 20260101000020: the `revoke update (role, programme_id) on profiles from
-- authenticated, anon` in that migration turned out to be ineffective. Supabase's default
-- schema setup grants UPDATE on profiles at the TABLE level (not per-column) to
-- authenticated/anon — table-level and column-level grants are independent ACL entries in
-- Postgres, and a role may update a column if EITHER grant permits it, so revoking only the
-- column-level entry left the table-level grant (still present) fully able to authorize it.
-- RLS WITH CHECK doesn't help either for the UPDATE-side fix: comparing NEW.role to OLD.role
-- via a self-referencing subquery on profiles sees the row's already-applied new value within
-- the same command, making such a check a tautology.
--
-- The correct, standard fix for "this column must be immutable through ordinary DML" is a
-- BEFORE UPDATE trigger, which fires for every UPDATE regardless of caller role or RLS/grants.
-- Confirmed no legitimate flow anywhere in this app (client or edge functions) ever updates an
-- existing profile's role or programme_id — both are only ever set once, at insert time
-- (src/store/authStore.ts's signupCoach/signupAthlete, or the add-athlete edge function) — so
-- blocking it unconditionally here has no legitimate-flow impact.
create or replace function prevent_profiles_role_programme_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.programme_id is distinct from old.programme_id then
    raise exception 'role and programme_id cannot be changed on an existing profile';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_programme_change on profiles;
create trigger profiles_prevent_role_programme_change
  before update on profiles
  for each row
  execute function prevent_profiles_role_programme_change();
