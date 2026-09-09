-- pgTAP suite for the four section 7.25 cron jobs Phase 1 now builds
-- (spec section 0.18; migration 20260909050000_phase1_cron_jobs.sql):
-- refresh_ages, purge_upload_tickets, and the listing/clearing functions
-- behind purge_incoming and purge_verification_selfies. The two Next.js
-- routes that call the listing functions and perform the actual Storage
-- deletion are outside pgTAP's reach (section 11.3's job, not 11.1's);
-- this suite covers everything that runs inside Postgres.
begin;
select plan(12);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('55555555-5555-5555-5555-555555555555', 'cron-fixture@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

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

-- ===== refresh_ages: corrects an age left stale by the passage of time,
-- not by a birth_date edit (the trigger in 20260909010200 only fires on a
-- birth_date write, so a birthday passing needs this separate job) =====

select private.test_login('55555555-5555-5555-5555-555555555555');
select public.attempt_set_birth_date((current_date - interval '25 years')::date);
select set_config('role', 'postgres', true);

-- Simulate a birthday having passed without any birth_date write: force
-- profiles.age one year stale using the same bypass GUC refresh_ages
-- itself uses, then confirm the cron function alone fixes it.
select set_config('app.bypass_profile_guard', 'on', true);
update public.profiles set age = age - 1 where id = '55555555-5555-5555-5555-555555555555';
select set_config('app.bypass_profile_guard', 'off', true);

select private.refresh_ages();

select is(
  (select age from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  25::smallint,
  'refresh_ages recomputes a stale age from birth_date'
);

-- ===== purge_upload_tickets: used, or unused and >24h past expiry =====

insert into public.upload_tickets (id, user_id, kind, object_path, position, created_at, expires_at, used_at)
values
  ('60000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'photo', 'incoming/55555555-5555-5555-5555-555555555555/1', 1, now() - interval '2 hours', now() - interval '2 hours' + interval '5 minutes', now() - interval '1 hour'),
  ('60000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'photo', 'incoming/55555555-5555-5555-5555-555555555555/2', 2, now() - interval '30 hours', now() - interval '30 hours' + interval '5 minutes', null),
  ('60000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'photo', 'incoming/55555555-5555-5555-5555-555555555555/3', 3, now() - interval '10 minutes', now() - interval '10 minutes' + interval '5 minutes', null);

select private.purge_upload_tickets();

select is(
  (select count(*)::int from public.upload_tickets where id = '60000000-0000-0000-0000-000000000001'),
  0,
  'purge_upload_tickets deletes a used ticket regardless of age'
);

select is(
  (select count(*)::int from public.upload_tickets where id = '60000000-0000-0000-0000-000000000002'),
  0,
  'purge_upload_tickets deletes an unused ticket more than 24 hours past expires_at'
);

select is(
  (select count(*)::int from public.upload_tickets where id = '60000000-0000-0000-0000-000000000003'),
  1,
  'purge_upload_tickets keeps an unused, already-expired ticket still inside the 24 hour grace window'
);

-- ===== list_stale_incoming_objects: age cutoff and bucket scoping =====

insert into storage.objects (bucket_id, name, created_at)
values
  ('incoming', '55555555-5555-5555-5555-555555555555/old-photo', now() - interval '2 hours'),
  ('incoming', '55555555-5555-5555-5555-555555555555/fresh-photo', now() - interval '5 minutes'),
  ('video-incoming', '55555555-5555-5555-5555-555555555555/old-video', now() - interval '2 hours'),
  ('photos', '55555555-5555-5555-5555-555555555555/some-photo.webp', now() - interval '2 hours');

select set_config('role', 'service_role', true);

select results_eq(
  $$ select bucket_id, object_name from public.list_stale_incoming_objects() order by bucket_id, object_name $$,
  $$ values ('incoming'::text, '55555555-5555-5555-5555-555555555555/old-photo'::text),
            ('video-incoming'::text, '55555555-5555-5555-5555-555555555555/old-video'::text) $$,
  'list_stale_incoming_objects returns only objects older than the cutoff, only from incoming/video-incoming'
);

select set_config('role', 'postgres', true);

-- ===== list_stale_verification_selfies + clear_verification_selfie_path =====

insert into public.verifications (id, profile_id, pose_code, selfie_path, submitted_at, decided_at, decision)
values
  ('70000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'look_left', 'verification/55555555-5555-5555-5555-555555555555/70000000-0000-0000-0000-000000000001.webp', now() - interval '3 days', now() - interval '2 days', 'approved'),
  ('70000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'look_right', 'verification/55555555-5555-5555-5555-555555555555/70000000-0000-0000-0000-000000000002.webp', now() - interval '2 hours', now() - interval '2 hours', 'approved');

select set_config('role', 'service_role', true);

select results_eq(
  $$ select verification_id, object_name from public.list_stale_verification_selfies() $$,
  $$ values ('70000000-0000-0000-0000-000000000001'::uuid, '55555555-5555-5555-5555-555555555555/70000000-0000-0000-0000-000000000001.webp'::text) $$,
  'list_stale_verification_selfies returns only selfies decided more than 1 day ago'
);

select public.clear_verification_selfie_path('70000000-0000-0000-0000-000000000001'::uuid);

select set_config('role', 'postgres', true);

select is(
  (select selfie_path from public.verifications where id = '70000000-0000-0000-0000-000000000001'),
  null,
  'clear_verification_selfie_path nulls selfie_path'
);

select is(
  (select selfie_path from public.verifications where id = '70000000-0000-0000-0000-000000000002'),
  'verification/55555555-5555-5555-5555-555555555555/70000000-0000-0000-0000-000000000002.webp',
  'clear_verification_selfie_path only touches the verification it is called for'
);

-- ===== negative grants: these three functions are service_role-only, not
-- merely undocumented for other roles (spec section 11.1's shape) =====

select private.test_login('55555555-5555-5555-5555-555555555555');

select throws_ok(
  $$ select public.list_stale_incoming_objects() $$,
  '42501',
  null,
  'list_stale_incoming_objects refuses authenticated (insufficient_privilege)'
);

select throws_ok(
  $$ select public.list_stale_verification_selfies() $$,
  '42501',
  null,
  'list_stale_verification_selfies refuses authenticated (insufficient_privilege)'
);

select throws_ok(
  $$ select public.clear_verification_selfie_path('70000000-0000-0000-0000-000000000002'::uuid) $$,
  '42501',
  null,
  'clear_verification_selfie_path refuses authenticated (insufficient_privilege)'
);

select set_config('role', 'anon', true);

select throws_ok(
  $$ select public.list_stale_incoming_objects() $$,
  '42501',
  null,
  'list_stale_incoming_objects refuses anon (insufficient_privilege)'
);

select set_config('role', 'postgres', true);

select * from finish();
rollback;
