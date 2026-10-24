-- Per-attempt detail for a weekly log (throws, jumps, sprint runs): result, wind, and
-- foul / false start / miss for each attempt, as a JSON array on the existing row.
--
-- Additive and backwards compatible: weekly_logs.best_performance stays the single "best legal
-- result" every chart, PB check and notification already reads — the app derives it from these
-- attempts when they're entered — and older app versions simply never touch this column.
-- Existing RLS (athletes read/write their own rows, coaches read their programme's) already
-- covers it because it's a column on the same table.
--
-- Shape of each element (matches the app's MeetAttempt):
--   { "attempt": 1, "mark": 16.42, "wind": "+1.2" | null, "foul": false, "notes": "" }

alter table weekly_logs
  add column if not exists attempts jsonb not null default '[]'::jsonb;

alter table weekly_logs
  drop constraint if exists weekly_logs_attempts_is_array;
alter table weekly_logs
  add constraint weekly_logs_attempts_is_array check (jsonb_typeof(attempts) = 'array');
