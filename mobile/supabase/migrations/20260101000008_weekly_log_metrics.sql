-- More wellness metrics on the weekly check-in: body weight and motivation,
-- alongside the existing sleep/soreness/energy scores.
alter table weekly_logs add column body_weight decimal;
alter table weekly_logs add column motivation_score int check (motivation_score between 1 and 10);
