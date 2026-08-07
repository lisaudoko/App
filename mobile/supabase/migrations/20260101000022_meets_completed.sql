-- Lets a coach explicitly mark a meet as completed. Replaces the previous purely
-- date-based "past" grouping on the Meets screen — a meet stays in "Upcoming" until
-- the coach closes it out, even after its date has passed, so it doesn't silently
-- fall out of view before results/notes are finished.
alter table meets add column completed boolean not null default false;
