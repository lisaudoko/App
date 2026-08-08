-- Sex is used for sex-specific event standards/class categories. Nullable since
-- it's unset on existing accounts until an athlete or coach fills it in.
alter table profiles add column sex text check (sex in ('male', 'female'));
