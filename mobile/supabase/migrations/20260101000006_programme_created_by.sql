-- Coach signup creates a programme before the coach's own profile row exists,
-- so auth_programme_id() can't resolve yet and the post-insert RETURNING read
-- (required by supabase-js's .select() after .insert()) fails RLS. Track the
-- creator explicitly so they can read the programme they just made.
alter table programmes add column created_by uuid references auth.users (id) on delete set null;

drop policy "programme members can read their programme" on programmes;

create policy "programme members can read their programme"
  on programmes for select
  using (id = auth_programme_id() or created_by = auth.uid());
