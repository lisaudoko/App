-- RevenueCat-backed coach subscription billing. Athletes are always free;
-- only coach accounts are gated.

alter table profiles add column subscription_exempt boolean not null default false;
alter table profiles add column trial_started_at timestamptz;
alter table profiles add column revenuecat_customer_id text;

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id) on delete cascade,
  tier text check (tier in ('starter', 'growth', 'pro', 'exempt')),
  status text not null check (status in ('trialing', 'active', 'expired', 'cancelled')),
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  revenuecat_entitlement text,
  updated_at timestamptz not null default now()
);

create index subscriptions_coach_idx on subscriptions (coach_id);
create unique index subscriptions_coach_unique on subscriptions (coach_id);

alter table subscriptions enable row level security;

-- Coaches read their own subscription row.
create policy "coaches read own subscription"
  on subscriptions for select
  using (coach_id = auth.uid());

-- No client insert/update/delete policies: subscriptions are only ever
-- written by the revenuecat-webhook edge function (service role, bypasses
-- RLS) and by setup_subscription_wiring's RPC below.

-- SECURITY DEFINER RPC so the client can safely stamp trial_started_at on a
-- coach's own profile the first time they log in, without a broad
-- self-update policy on sensitive billing columns.
create or replace function start_trial_if_needed(target_programme_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set trial_started_at = now()
  where id = auth.uid()
    and role = 'coach'
    and trial_started_at is null;

  insert into subscriptions (coach_id, programme_id, tier, status, trial_ends_at)
  select auth.uid(), target_programme_id, null, 'trialing', now() + interval '30 days'
  where not exists (select 1 from subscriptions where coach_id = auth.uid());
end;
$$;

grant execute on function start_trial_if_needed(uuid) to authenticated;
