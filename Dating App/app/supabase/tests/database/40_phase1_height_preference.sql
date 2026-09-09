-- pgTAP suite for height as a non-negotiable (spec sections 0.9, 5.1,
-- 5.2; migration 20260909040000_phase1_height_preference.sql). Same
-- fixture pattern as the other Phase 1 suites: a real auth.users row so
-- on_auth_user_created creates the preferences row exactly as production
-- would, and private.test_login() to simulate PostgREST's per-request
-- role/JWT.
begin;
select plan(12);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'alice@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

create or replace function private.test_login(uid uuid, aal text default 'aal1')
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', format('{"sub":"%s","aal":"%s"}', uid, aal), true);
end;
$$;

select private.test_login('11111111-1111-1111-1111-111111111111');

-- ===== defaults =====

select is(
  (select height_pref_mode::text from public.preferences where profile_id = '11111111-1111-1111-1111-111111111111'),
  'doesnt_matter',
  'a new preferences row defaults height_pref_mode to doesnt_matter'
);

select is(
  (select height_pref_must from public.preferences where profile_id = '11111111-1111-1111-1111-111111111111'),
  false,
  'a new preferences row defaults height_pref_must to false'
);

-- ===== height_pref_must_needs_mode: can't be a must-have of "doesn't matter" =====

select throws_like(
  $$ update public.preferences set height_pref_must = true where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_must_needs_mode%',
  'height_pref_must cannot be true while height_pref_mode is still doesnt_matter'
);

-- ===== height_pref_range_needs_bounds: range mode needs both bounds, min<=max =====

select throws_like(
  $$ update public.preferences set height_pref_mode = 'range' where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_range_needs_bounds%',
  'range mode with no min/max is rejected'
);

select throws_like(
  $$ update public.preferences set height_pref_mode = 'range', height_pref_min_cm = 180, height_pref_max_cm = 160 where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_range_needs_bounds%',
  'range mode with min > max is rejected'
);

-- ===== height_pref_bounds_need_range: bounds only make sense in range mode =====

select throws_like(
  $$ update public.preferences set height_pref_mode = 'taller', height_pref_min_cm = 160 where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_bounds_need_range%',
  'a min_cm set while mode is not range is rejected'
);

-- ===== sane bounds =====

select throws_like(
  $$ update public.preferences set height_pref_mode = 'range', height_pref_min_cm = 100, height_pref_max_cm = 190 where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_bounds_sane%',
  'a min_cm outside 120..230 is rejected even in range mode'
);

-- height_pref_bounds_sane and height_pref_max_sane are separate
-- constraints, one per column (so a violation names the specific column
-- at fault); this is the max-side twin of the test just above, which the
-- min-side case can't exercise since it fails before max is even checked.
select throws_like(
  $$ update public.preferences set height_pref_mode = 'range', height_pref_min_cm = 150, height_pref_max_cm = 250 where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_max_sane%',
  'a max_cm outside 120..230 is rejected even in range mode'
);

-- ===== valid updates succeed =====

select lives_ok(
  $$ update public.preferences set height_pref_mode = 'taller', height_pref_must = true where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  'taller mode with must=true succeeds (no accept-array shape like the other must fields -- height compares directly against the candidate''s own height_cm)'
);

select lives_ok(
  $$ update public.preferences set height_pref_mode = 'range', height_pref_min_cm = 165, height_pref_max_cm = 185, height_pref_must = false where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  'range mode with valid, ordered bounds succeeds'
);

select is(
  (select height_pref_min_cm from public.preferences where profile_id = '11111111-1111-1111-1111-111111111111'),
  165::smallint,
  'the valid range update actually persisted height_pref_min_cm'
);

-- ===== turning height_pref_must back on while mode is doesnt_matter still fails,
-- confirming the guard isn't just a one-time insert-time check =====

select throws_like(
  $$ update public.preferences set height_pref_mode = 'doesnt_matter', height_pref_min_cm = null, height_pref_max_cm = null, height_pref_must = true where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '%height_pref_must_needs_mode%',
  'reverting to doesnt_matter while must stays true is still rejected, not just on first insert'
);

select * from finish();
rollback;
