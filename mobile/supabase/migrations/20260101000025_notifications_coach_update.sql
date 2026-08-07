-- The bell's unread red dot never cleared for coaches: notifications_log had an UPDATE
-- policy only for athletes marking their own notifications read ("athletes mark own
-- notifications read", 20260101000000_init.sql). Every row a coach sees has athlete_id set
-- to some athlete's id, never the coach's own auth.uid(), so a coach's UPDATE matched zero
-- rows under RLS — silently, since Postgres treats "0 rows matched" as success, not an
-- error, and markNotificationRead() didn't check the result either way.
create policy "coaches mark programme notifications read"
  on notifications_log for update
  using (auth_role() = 'coach' and programme_id = auth_programme_id())
  with check (auth_role() = 'coach' and programme_id = auth_programme_id());
