-- Date of birth (coaches need this for eligibility/age-group decisions) and a
-- free-text classification field (e.g. "Open", "Class 1", "U20" — terminology
-- varies by federation/country, so this is deliberately not a fixed enum).
alter table profiles add column date_of_birth date;
alter table profiles add column class_category text;

-- Athlete status (active/injured/rest/inactive) was previously hardcoded to
-- 'active' in src/data/repository.ts's toAthlete() — there was no real column
-- backing it at all, so it could never reflect reality or be filtered on.
alter table profiles add column status text not null default 'active'
  check (status in ('active', 'injured', 'rest', 'inactive'));
