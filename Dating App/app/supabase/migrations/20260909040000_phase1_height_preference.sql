-- Phase 1: height as a non-negotiable (spec sections 0.9, 5.1, 5.2). This
-- column set predates no existing data (preferences rows all default
-- doesnt_matter/false below), so it's a plain additive migration, unlike
-- the video_prompt enum's same-transaction restriction: height_pref is a
-- brand-new type, not a new value on one already in use, so it can be
-- created and used in the same file.
--
-- Only the data-collection half lives here. mutually_compatible() and
-- reciprocal_score() actually reading these columns (spec sections 7.2,
-- 7.3) is Phase 2 matching logic, gated behind the Phase -1 legal review
-- like the rest of that phase; these columns simply need to exist and be
-- collectable now, the same way kids/faith/politics preferences already
-- are, well before anything reads them for real.

create type public.height_pref as enum ('doesnt_matter', 'taller', 'around', 'shorter', 'range');

alter table public.preferences
  add column height_pref_mode public.height_pref not null default 'doesnt_matter',
  add column height_pref_min_cm smallint,
  add column height_pref_max_cm smallint,
  add column height_pref_must boolean not null default false;

alter table public.preferences
  add constraint height_pref_must_needs_mode
    check (not height_pref_must or height_pref_mode <> 'doesnt_matter'),
  add constraint height_pref_range_needs_bounds
    check (height_pref_mode <> 'range' or (height_pref_min_cm is not null and height_pref_max_cm is not null and height_pref_min_cm <= height_pref_max_cm)),
  add constraint height_pref_bounds_need_range
    check (height_pref_mode = 'range' or (height_pref_min_cm is null and height_pref_max_cm is null)),
  add constraint height_pref_bounds_sane
    check (height_pref_min_cm is null or height_pref_min_cm between 120 and 230),
  add constraint height_pref_max_sane
    check (height_pref_max_cm is null or height_pref_max_cm between 120 and 230);
