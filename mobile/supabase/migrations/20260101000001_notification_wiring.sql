-- Wiring for send-notifications: a Database Webhook on weekly_logs insert,
-- plus a weekly pg_cron job for missing-log / qualifying-risk sweeps.
--
-- Both need the live project URL + a service key, which don't exist until
-- the project is provisioned. Rather than hardcode them into a migration,
-- this file defines a re-runnable setup function. After deploying the
-- send-notifications edge function, run once (SQL editor or CLI):
--
--   select setup_notification_wiring(
--     'https://<project-ref>.supabase.co',
--     '<service-role-key>'
--   );

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Holds the project's own functions URL + service role key so trigger/cron
-- callbacks can call back into edge functions. Never exposed to clients.
create table app_settings (key text primary key, value text not null);
alter table app_settings enable row level security;

create or replace function setup_notification_wiring(project_url text, service_role_key text)
returns void
language plpgsql
security definer
set search_path = public, cron
as $$
begin
  -- Fire send-notifications on every new weekly_logs row (new PB / high RPE checks).
  drop trigger if exists weekly_logs_notify_trigger on weekly_logs;

  create trigger weekly_logs_notify_trigger
    after insert on weekly_logs
    for each row
    execute function pg_net_notify_send_notifications();

  -- Store connection details the trigger function reads at fire time.
  insert into app_settings (key, value) values ('functions_url', project_url || '/functions/v1')
    on conflict (key) do update set value = excluded.value;
  insert into app_settings (key, value) values ('service_role_key', service_role_key)
    on conflict (key) do update set value = excluded.value;

  -- Weekly cron sweep: Mondays 06:00 UTC — missing logs + qualifying risk.
  perform cron.unschedule(jobid) from cron.job where jobname = 'weekly-notifications-sweep';
  perform cron.schedule(
    'weekly-notifications-sweep',
    '0 6 * * 1',
    $cron$
      select net.http_post(
        url := (select value from app_settings where key = 'functions_url') || '/send-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select value from app_settings where key = 'service_role_key')
        ),
        body := jsonb_build_object('trigger', 'cron')
      );
    $cron$
  );
end;
$$;

create or replace function pg_net_notify_send_notifications()
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
    -- Wiring not set up yet (setup_notification_wiring never called) — no-op.
    return new;
  end if;

  perform net.http_post(
    url := functions_url || '/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'trigger', 'insert',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;
