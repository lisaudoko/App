-- Coach-created athlete accounts get a coach-chosen temporary password
-- (supabase/functions/add-athlete). This flags that the athlete must set their own
-- password before using the app further, checked at login and cleared once they do.
alter table profiles add column must_change_password boolean not null default false;
