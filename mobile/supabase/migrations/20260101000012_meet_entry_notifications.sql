-- Fires send-notifications when a meet_entries row's final_mark or qualified
-- status actually changes (not on every attempts edit) — app_settings is
-- already populated from the original weekly_logs wiring, so no re-run of
-- setup_notification_wiring() is needed.
create or replace function pg_net_notify_meet_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  functions_url text;
  service_key text;
begin
  select value into functions_url from app_settings where key = 'functions_url';
  select value into service_key from app_settings where key = 'service_role_key';

  if functions_url is null then
    return new;
  end if;

  perform net.http_post(
    url := functions_url || '/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'trigger', 'meet_entry',
      'record', to_jsonb(new),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end;
$$;

-- Split into separate INSERT/UPDATE triggers rather than one combined
-- "insert or update" trigger — a WHEN clause referencing OLD is not valid
-- on the INSERT half of a combined trigger.
drop trigger if exists meet_entries_insert_notify_trigger on meet_entries;
drop trigger if exists meet_entries_update_notify_trigger on meet_entries;

create trigger meet_entries_insert_notify_trigger
  after insert on meet_entries
  for each row
  when (new.final_mark is not null or new.qualified)
  execute function pg_net_notify_meet_entry();

create trigger meet_entries_update_notify_trigger
  after update of final_mark, qualified on meet_entries
  for each row
  when (new.final_mark is distinct from old.final_mark or new.qualified is distinct from old.qualified)
  execute function pg_net_notify_meet_entry();
