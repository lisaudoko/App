-- Calendar feature: anchors a programme's training weeks to real calendar
-- dates. week_number stays a pure integer everywhere else (workouts,
-- weekly_logs) — a week's actual Mon–Sun dates are always *derived* as
-- season_start_date + (week_number - 1) * 7 days, never stored per-week.
-- Nullable: existing programmes have none until their coach sets it (see
-- src/lib/calendarDates.ts + the Calendar screen's first-run prompt).
alter table programmes add column season_start_date date;

comment on column programmes.season_start_date is
  'Monday of training week 1. Training-week dates are computed client-side as season_start_date + (week_number-1)*7 days — never stored per-week.';
