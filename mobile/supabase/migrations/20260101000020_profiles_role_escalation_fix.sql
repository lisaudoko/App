-- P0 security fix (found via audit, 2026-08-07): "athletes update own profile" and
-- "users insert own profile" both check only `id = auth.uid()`, with no WITH CHECK
-- restricting which columns/values can be written. role and programme_id are exactly
-- the two columns auth_role()/auth_programme_id() read to gate every other RLS policy
-- and every edge function in the schema — so either policy let any signed-in user grant
-- themselves 'coach' over an arbitrary programme_id via a direct REST call, bypassing
-- the app UI entirely (which never sends these fields itself; RLS/grants, not app code,
-- are the real enforcement boundary). The INSERT path was the broader of the two: any
-- freshly created account (no prior programme membership, no join code) could self-insert
-- role='coach' against ANY existing programme's id, immediately gaining full coach
-- privileges (athlete_notes, meet_entries coach fields, broadcast, add-athlete, etc.)
-- over that programme's real athletes — a full cross-tenant breach, not just privilege
-- escalation within one's own programme.
--
-- role/programme_id are only ever legitimately set after the initial signup insert via
-- edge functions running as the service role (add-athlete, remove-athlete), a distinct
-- Postgres role from `authenticated`/`anon` and unaffected by the REVOKE below — so this
-- closes the gap with no legitimate-flow impact.

revoke update (role, programme_id) on profiles from authenticated, anon;

-- Legitimate self-insert shapes are exactly the two in src/store/authStore.ts:
-- signupCoach inserts role='coach' for a programme_id the same user just created (and is
-- recorded as created_by of); signupAthlete inserts role='athlete' for a programme_id
-- resolved server-side from a join code via the programme_id_for_join_code RPC. The coach
-- half is now enforced here; the athlete half's join-code legitimacy is still enforced by
-- that RPC + the app flow, not by this policy (self-inserting role='athlete' against an
-- arbitrary programme_id one didn't get from a real join code remains a known, separate,
-- lower-severity gap — flagged, not fixed, in this migration).
drop policy if exists "users insert own profile" on profiles;
create policy "users insert own profile"
  on profiles for insert
  with check (
    id = auth.uid()
    and (
      role = 'athlete'
      or (role = 'coach' and exists (select 1 from programmes p where p.id = programme_id and p.created_by = auth.uid()))
    )
  );
