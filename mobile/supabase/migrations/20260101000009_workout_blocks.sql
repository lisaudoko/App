-- Replaces the flat exercises list with a structured block-based workout
-- builder. Existing plans are preserved by wrapping their flat exercise
-- array into a single "Weightlifting" block before the old column is
-- dropped, so no coach's saved workout data is lost.
alter table workouts add column blocks jsonb not null default '[]'::jsonb;

update workouts
set blocks = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'weightlifting',
    'label', 'Weightlifting',
    'order', 0,
    'exercises', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'name', coalesce(ex->>'name', ''),
          'category', null,
          'sets', nullif(ex->>'sets', '')::int,
          'repsPattern', ex->>'reps',
          'pctOfMax', null,
          'weightLbs', nullif(ex->>'weightOverride', '')::decimal,
          'distanceMetres', null,
          'intensityPct', null,
          'restSeconds', null,
          'timeSeconds', null,
          'coachingCue', null,
          'notes', null
        )
      ), '[]'::jsonb)
      from jsonb_array_elements(exercises) as ex
    )
  )
)
where jsonb_array_length(exercises) > 0;

alter table workouts drop column exercises;
