-- Calendar feature: notify an athlete the moment they're entered into a
-- meet ("you've been added — want it on your calendar?"), independent of
-- the existing meet_entry trigger (20260101000012), which deliberately only
-- fires once a final_mark/qualified value is already present. A brand new
-- entry with no result yet would never trip that trigger, so this is a
-- separate, unconditional insert trigger rather than a broadened WHEN
-- clause on the existing one — the two can both fire on the same row (e.g.
-- a backfilled entry that already has a mark) without conflict.
alter table notifications_log drop constraint notifications_log_type_check;
alter table notifications_log add constraint notifications_log_type_check
  check (type in ('pb', 'missing_log', 'high_rpe', 'anomaly', 'qualifying_risk', 'meet_pb', 'meet_qualified', 'broadcast', 'workout_complete', 'meet_added'));

create or replace function pg_net_notify_meet_entry_created()
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
      'trigger', 'meet_entry_created',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

create trigger meet_entries_created_notify_trigger
  after insert on meet_entries
  for each row
  execute function pg_net_notify_meet_entry_created();
