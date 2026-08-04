-- The programmes table had SELECT and INSERT policies but no UPDATE policy,
-- so saveProgrammeConfig()'s event_groups update was silently matching zero
-- rows (no error, nothing persisted) — coaches got stuck re-doing onboarding
-- forever, and add-athlete could never read back a configured event group.
create policy "coaches can update their programme"
  on programmes for update
  using (auth_role() = 'coach' and id = auth_programme_id())
  with check (auth_role() = 'coach' and id = auth_programme_id());
