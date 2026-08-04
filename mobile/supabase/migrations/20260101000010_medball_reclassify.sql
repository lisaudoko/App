-- "Med Ball Rotational Throws" was seeded into the Weightlifting block (an
-- artifact of the old flat-exercise migration) — it belongs in Med Ball &
-- Mobility instead. Moves it out of any weightlifting block and into an
-- existing (or newly created) med_ball_mobility block, per workout row.
do $$
declare
  wk record;
  new_blocks jsonb;
  moved_exercises jsonb;
  block jsonb;
  ex jsonb;
  medball_idx int;
  i int;
begin
  for wk in select id, blocks from workouts where blocks::text ilike '%med ball rotational throws%' loop
    new_blocks := '[]'::jsonb;
    moved_exercises := '[]'::jsonb;

    for i in 0 .. jsonb_array_length(wk.blocks) - 1 loop
      block := wk.blocks -> i;
      if block->>'type' = 'weightlifting' then
        for ex in select * from jsonb_array_elements(block->'exercises') loop
          if lower(ex->>'name') = 'med ball rotational throws' then
            moved_exercises := moved_exercises || jsonb_build_array(ex);
          end if;
        end loop;
        block := jsonb_set(block, '{exercises}', (
          select coalesce(jsonb_agg(e), '[]'::jsonb)
          from jsonb_array_elements(block->'exercises') e
          where lower(e->>'name') != 'med ball rotational throws'
        ));
      end if;
      new_blocks := new_blocks || jsonb_build_array(block);
    end loop;

    if jsonb_array_length(moved_exercises) = 0 then
      continue;
    end if;

    medball_idx := null;
    for i in 0 .. jsonb_array_length(new_blocks) - 1 loop
      if (new_blocks -> i) ->> 'type' = 'med_ball_mobility' then
        medball_idx := i;
      end if;
    end loop;

    if medball_idx is not null then
      new_blocks := jsonb_set(
        new_blocks,
        array[medball_idx::text, 'exercises'],
        (new_blocks -> medball_idx -> 'exercises') || moved_exercises
      );
    else
      new_blocks := new_blocks || jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'med_ball_mobility',
          'label', 'Med Ball & Mobility',
          'order', jsonb_array_length(new_blocks),
          'exercises', moved_exercises
        )
      );
    end if;

    update workouts set blocks = new_blocks where id = wk.id;
  end loop;
end $$;
