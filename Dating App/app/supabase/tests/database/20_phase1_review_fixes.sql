-- Regression tests for the Phase 1 review-cycle fixes (see the
-- 20260909020000_phase1_review_fixes.sql migration for what each of these
-- closes). Same fixture pattern as 10_phase1_rls_and_functions.sql: real
-- auth.users rows so on_auth_user_created runs for real, and
-- private.test_login() to simulate PostgREST's per-request role/JWT.
begin;
select plan(23);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

insert into public.admins (user_id) values ('33333333-3333-3333-3333-333333333333');

-- Same helper as 10_phase1_rls_and_functions.sql, redefined here because it
-- was created inside that file's own transaction and rolled back with it;
-- each pgTAP file is independently transactional, so this needs to exist
-- fresh in every file that calls it.
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

-- ===== fix 1: DELETE denied on profile_sensitive/profile_answers/preferences =====

select private.test_login('11111111-1111-1111-1111-111111111111');

delete from public.profile_sensitive where profile_id = auth.uid();
select is(
  (select count(*)::int from public.profile_sensitive where profile_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice cannot delete her own profile_sensitive row'
);

delete from public.profile_answers where profile_id = auth.uid();
select is(
  (select count(*)::int from public.profile_answers where profile_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice cannot delete her own profile_answers row'
);

delete from public.preferences where profile_id = auth.uid();
select is(
  (select count(*)::int from public.preferences where profile_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice cannot delete her own preferences row'
);

-- ===== fix 6: birth_date is create/set only through attempt_set_birth_date =====

select throws_like(
  $$ insert into public.profile_private (profile_id, birth_date) values (auth.uid(), '2000-01-01') $$,
  '%row-level security%',
  'alice cannot INSERT profile_private directly (no INSERT policy)'
);

select is(
  (select public.attempt_set_birth_date((current_date - interval '10 years')::date)),
  '{"ok": false, "code": "underage"}'::jsonb,
  'attempt_set_birth_date refuses an under-18 date of birth, returning a result rather than raising'
);

-- age_gate_rejections has no grants at all for authenticated (by design --
-- it's a private-schema table with no policy and no GRANT, same posture as
-- every other private table); step up to postgres to inspect it, then
-- resume as alice.
select set_config('role', 'postgres', true);
select is(
  (select count(*)::int from private.age_gate_rejections where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'the underage attempt is logged (without the date) in private.age_gate_rejections'
);
select private.test_login('11111111-1111-1111-1111-111111111111');

select is(
  (select count(*)::int from public.profile_private where profile_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'no profile_private row was created by the refused underage attempt'
);

select is(
  (select public.attempt_set_birth_date((current_date - interval '25 years')::date)),
  '{"ok": true}'::jsonb,
  'attempt_set_birth_date accepts a valid 18+ date of birth'
);

delete from public.profile_private where profile_id = auth.uid();
select is(
  (select count(*)::int from public.profile_private where profile_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice cannot delete her own profile_private row, even after it legitimately exists'
);

select throws_like(
  $$ update public.profile_private set birth_date = (current_date - interval '30 years')::date where profile_id = auth.uid() $$,
  '%not_authorized%',
  'a direct UPDATE of birth_date is rejected even though other profile_private columns stay owner-writable'
);

select lives_ok(
  $$ update public.profile_private set email_notifications = false where profile_id = auth.uid() $$,
  'other profile_private columns (e.g. email_notifications) remain directly owner-writable'
);

-- ===== fix 7: prompts flag is not silently dropped when profile_private is missing =====

select private.test_login('22222222-2222-2222-2222-222222222222');

select throws_like(
  $$
  update public.profiles set prompts = jsonb_build_array(
    jsonb_build_object('prompt_id', 'p1', 'answer', 'hmu on instagram @bob_xyz'),
    jsonb_build_object('prompt_id', 'p2', 'answer', 'ok'),
    jsonb_build_object('prompt_id', 'p3', 'answer', 'ok')
  ) where id = auth.uid()
  $$,
  '%age_gate_required%',
  'a flagged prompts write before profile_private exists raises instead of silently dropping the flag'
);

select public.attempt_set_birth_date((current_date - interval '25 years')::date);

select lives_ok(
  $$
  update public.profiles set prompts = jsonb_build_array(
    jsonb_build_object('prompt_id', 'p1', 'answer', 'venmo me @bob for the bet'),
    jsonb_build_object('prompt_id', 'p2', 'answer', 'ok'),
    jsonb_build_object('prompt_id', 'p3', 'answer', 'ok')
  ) where id = auth.uid()
  $$,
  'once profile_private exists, a flagged prompts write succeeds and is recorded'
);

select is(
  (select review_flags from public.profile_private where profile_id = '22222222-2222-2222-2222-222222222222'),
  '{"social_handle": true}'::jsonb,
  'a payment-app mention (venmo) is caught by the social-handle scan'
);

-- ===== fix 3b: faith_key cannot be desynced from faith_label =====

update public.profile_answers set faith_label = 'Christianity' where profile_id = auth.uid();
update public.profile_answers set faith_key = 'sneaky_bogus' where profile_id = auth.uid();
select is(
  (select faith_key from public.profile_answers where profile_id = '22222222-2222-2222-2222-222222222222'),
  'christianity',
  'setting faith_key directly is overridden by the re-derive-on-every-write trigger'
);

-- ===== fix 5: empty accept array with must=true is rejected, not silently allowed =====

select throws_ok(
  $$ update public.preferences set kids_must = true, kids_accept = '{}' where profile_id = auth.uid() $$,
  '23514',
  null,
  'kids_must=true with an empty kids_accept array is rejected (NULL-safe CHECK)'
);

-- ===== fix 4: renaming a heritage value at the 5-value cap =====

select private.test_login('11111111-1111-1111-1111-111111111111');

insert into public.profile_heritage (profile_id, field, value, value_key)
select auth.uid(), 'language', v, ''
from unnest(array['English', 'French', 'Spanish', 'German', 'Italian']) as v;

select lives_ok(
  $$ update public.profile_heritage set value = 'Portuguese' where profile_id = auth.uid() and field = 'language' and value = 'Italian' $$,
  'renaming one of 5 heritage values at the cap succeeds'
);

select throws_like(
  $$ insert into public.profile_heritage (profile_id, field, value, value_key) values (auth.uid(), 'language', 'Japanese', '') $$,
  '%too_many_heritage_values%',
  'a genuine 6th distinct heritage value is still rejected'
);

-- ===== fix 2: replacing a photo at the 6-photo cap =====
-- photos has no INSERT policy for authenticated at all (only
-- process_upload's SECURITY DEFINER body writes rows); step up to
-- postgres to exercise enforce_photo_limit directly, the same way
-- process_upload's elevated privileges would. auth.uid() still resolves
-- to alice since only the role GUC changes, not the JWT claims.

select set_config('role', 'postgres', true);

insert into public.photos (id, profile_id, position, storage_path)
select gen_random_uuid(), auth.uid(), n,
  'photos/' || auth.uid()::text || '/' || gen_random_uuid()::text || '.webp'
from generate_series(1, 6) as n;

select lives_ok(
  $$
  insert into public.photos (id, profile_id, position, storage_path)
  values (gen_random_uuid(), auth.uid(), 3, 'photos/' || auth.uid()::text || '/' || gen_random_uuid()::text || '.webp')
  on conflict (profile_id, position) do update
    set id = excluded.id, storage_path = excluded.storage_path
  $$,
  'replacing an existing photo while already at the 6-photo cap succeeds'
);

select private.test_login('11111111-1111-1111-1111-111111111111');

-- ===== fix 9: process_upload requires the object to actually exist in Storage =====

select public.create_upload_ticket('photo'::public.upload_kind, 5::smallint, null::uuid) as ticket \gset
select (:'ticket'::jsonb->>'ticketId')::uuid as ticket_id \gset
select public.begin_upload(:'ticket_id'::uuid) as begun \gset

select throws_like(
  format('select public.process_upload(%L::uuid, 800::smallint, 600::smallint)', :'ticket_id'),
  '%object_not_uploaded%',
  'process_upload refuses a ticket whose destination object was never actually uploaded'
);

-- storage.objects has no INSERT policy for authenticated either (real
-- uploads go through the secret-key client, which bypasses RLS
-- entirely); step up to postgres for this one write, same as the photos
-- fixture above.
select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name)
values ('photos', auth.uid()::text || '/' || :'ticket_id' || '.webp');
select private.test_login('11111111-1111-1111-1111-111111111111');

select lives_ok(
  format('select public.process_upload(%L::uuid, 800::smallint, 600::smallint)', :'ticket_id'),
  'process_upload succeeds once the destination object genuinely exists'
);

-- ===== fix 10: admin_review_verification is idempotent, and rejects a null decision =====

select private.test_login('22222222-2222-2222-2222-222222222222');
select public.start_verification() as pose \gset
select (:'pose'::jsonb->>'verificationId')::uuid as verification_id \gset

select private.test_login('33333333-3333-3333-3333-333333333333', 'aal2');

select throws_like(
  format('select public.admin_review_verification(%L::uuid, null::public.verification_decision, null)', :'verification_id'),
  '%invalid_decision%',
  'admin_review_verification rejects a null decision instead of silently taking the reject branch'
);

select public.admin_review_verification(:'verification_id'::uuid, 'approved'::public.verification_decision, null);

select throws_like(
  format('select public.admin_review_verification(%L::uuid, ''rejected''::public.verification_decision, null)', :'verification_id'),
  '%already_decided%',
  'a second decision on the same verification is refused instead of silently overwriting the first'
);

select * from finish();
rollback;
