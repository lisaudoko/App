-- Caps how many AI-assistant questions a coach can ask per day (Anthropic API
-- usage costs real money) — one row per coach per day, incremented atomically
-- by increment_ai_message_usage() so concurrent requests can't both slip
-- through under the limit.
create table ai_message_usage (
  coach_id uuid not null references profiles (id) on delete cascade,
  usage_date date not null default current_date,
  message_count int not null default 0,
  primary key (coach_id, usage_date)
);

alter table ai_message_usage enable row level security;

-- Read-only for the client (used to show "X of 3 used" in the UI) — all writes
-- go through the SECURITY DEFINER function below, never a direct insert/update.
create policy "coach reads own ai usage" on ai_message_usage
  for select using (coach_id = auth.uid());

-- Atomically checks-and-increments today's count, returning the new count, or
-- null if the daily limit has already been reached (so nothing is incremented
-- past it). Must be atomic — a select-then-insert from the edge function would
-- let two concurrent requests both read "2 of 3" and both proceed.
create or replace function increment_ai_message_usage(daily_limit int default 3)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into ai_message_usage (coach_id, usage_date, message_count)
  values (auth.uid(), current_date, 0)
  on conflict (coach_id, usage_date) do nothing;

  update ai_message_usage
  set message_count = message_count + 1
  where coach_id = auth.uid()
    and usage_date = current_date
    and message_count < daily_limit
  returning message_count into new_count;

  return new_count;
end;
$$;

grant execute on function increment_ai_message_usage(int) to authenticated;
