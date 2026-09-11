-- pgTAP suite for the video prompt upload pipeline (spec sections 0.14,
-- 5.1, 5.2, 6.4, 7.16, 7.17, 7.17a, 7.30; migrations
-- 20260909030000/030100/030200). Same fixture pattern as
-- 10_phase1_rls_and_functions.sql and 20_phase1_review_fixes.sql.
begin;
select plan(20);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

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

-- ===== create_upload_ticket('video_prompt') paths =====

select public.create_upload_ticket('video_prompt'::public.upload_kind) as ticket \gset
select (:'ticket'::jsonb->>'ticketId')::uuid as ticket_id \gset

select matches(
  :'ticket'::jsonb->>'objectPath',
  '^video-incoming/11111111-1111-1111-1111-111111111111/',
  'a video_prompt ticket''s objectPath lands in video-incoming, not incoming'
);

select matches(
  :'ticket'::jsonb->>'posterObjectPath',
  '^incoming/11111111-1111-1111-1111-111111111111/.*-poster$',
  'a video_prompt ticket also reserves a poster path in incoming'
);

-- ===== a photo ticket still rejects an unexpected verification_id (spec
-- section 0.13's review-fixes fix #8, regressed and re-fixed while
-- building this feature -- guarded here so it can't silently regress a
-- second time) =====

select throws_like(
  format('select public.create_upload_ticket(%L::public.upload_kind, 1::smallint, %L::uuid)', 'photo', gen_random_uuid()),
  '%unexpected_verification_id%',
  'a photo ticket still refuses an unexpected verification_id'
);

-- ===== begin_upload computes both destination paths =====

select public.begin_upload(:'ticket_id'::uuid) as begun \gset

select matches(
  :'begun'::jsonb->>'destPath',
  '^video-prompts/11111111-1111-1111-1111-111111111111/.*\.webm$',
  'begin_upload derives a video-prompts/*.webm placeholder destination for a video_prompt ticket'
);

select matches(
  :'begun'::jsonb->>'posterDestPath',
  '^video-prompts/11111111-1111-1111-1111-111111111111/.*\.webp$',
  'begin_upload derives a video-prompts/*.webp poster destination too'
);

-- ===== process_upload and process_video_prompt_upload refuse each other's kind =====

select throws_like(
  format('select public.process_upload(%L::uuid, 800::smallint, 600::smallint)', :'ticket_id'),
  '%wrong_kind%',
  'process_upload refuses a video_prompt ticket'
);

select public.create_upload_ticket('photo'::public.upload_kind, 1::smallint, null::uuid) as photo_ticket \gset
select (:'photo_ticket'::jsonb->>'ticketId')::uuid as photo_ticket_id \gset
select public.begin_upload(:'photo_ticket_id'::uuid) as photo_begun \gset

select throws_like(
  format('select public.process_video_prompt_upload(%L::uuid, %L::text, 100::smallint, 100::smallint, 5000::integer, %L::text)', :'photo_ticket_id', 'webm', 'test prompt'),
  '%wrong_kind%',
  'process_video_prompt_upload refuses a photo ticket'
);

-- ===== process_video_prompt_upload validates video_format itself =====

select throws_like(
  format('select public.process_video_prompt_upload(%L::uuid, %L::text, 300::smallint, 300::smallint, 12000::integer, %L::text)', :'ticket_id', 'mov', 'a valid prompt'),
  '%invalid_video_format%',
  'process_video_prompt_upload rejects a video_format outside webm/mp4'
);

-- ===== process_video_prompt_upload requires both objects to actually exist =====

select throws_like(
  format('select public.process_video_prompt_upload(%L::uuid, %L::text, 300::smallint, 300::smallint, 12000::integer, %L::text)', :'ticket_id', 'webm', 'What are you looking forward to building with someone?'),
  '%object_not_uploaded%',
  'process_video_prompt_upload refuses when neither the video nor the poster was actually uploaded'
);

select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name)
values ('video-prompts', '11111111-1111-1111-1111-111111111111/' || :'ticket_id' || '.webm');
select private.test_login('11111111-1111-1111-1111-111111111111');

select throws_like(
  format('select public.process_video_prompt_upload(%L::uuid, %L::text, 300::smallint, 300::smallint, 12000::integer, %L::text)', :'ticket_id', 'webm', 'What are you looking forward to building with someone?'),
  '%object_not_uploaded%',
  'process_video_prompt_upload still refuses when only the video, not the poster, was uploaded'
);

select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name)
values ('video-prompts', '11111111-1111-1111-1111-111111111111/' || :'ticket_id' || '.webp');
select private.test_login('11111111-1111-1111-1111-111111111111');

select throws_like(
  format('select public.process_video_prompt_upload(%L::uuid, %L::text, 300::smallint, 300::smallint, 12000::integer, %L::text)', :'ticket_id', 'webm', ''),
  '%invalid_prompt_text%',
  'process_video_prompt_upload rejects an empty prompt_text even once both objects exist'
);

select lives_ok(
  format('select public.process_video_prompt_upload(%L::uuid, %L::text, 300::smallint, 300::smallint, 12000::integer, %L::text)', :'ticket_id', 'webm', 'What are you looking forward to building with someone?'),
  'process_video_prompt_upload succeeds once both objects exist and prompt_text is valid'
);

select is(
  (select prompt_text from public.video_prompts where profile_id = '11111111-1111-1111-1111-111111111111'),
  'What are you looking forward to building with someone?',
  'the video_prompts row records the prompt_text that was passed in'
);

select is(
  (select video_path from public.video_prompts where profile_id = '11111111-1111-1111-1111-111111111111'),
  'video-prompts/11111111-1111-1111-1111-111111111111/' || :'ticket_id' || '.webm',
  'a webm upload is stored with a .webm path'
);

-- ===== a genuinely MP4 upload (Safari) is stored as .mp4, not silently
-- mislabeled .webm -- this is the fix for the finding this feature's own
-- review cycle raised =====

select public.create_upload_ticket('video_prompt'::public.upload_kind) as mp4_ticket \gset
select (:'mp4_ticket'::jsonb->>'ticketId')::uuid as mp4_ticket_id \gset
select public.begin_upload(:'mp4_ticket_id'::uuid) as mp4_begun \gset

select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name)
values
  ('video-prompts', '11111111-1111-1111-1111-111111111111/' || :'mp4_ticket_id' || '.mp4'),
  ('video-prompts', '11111111-1111-1111-1111-111111111111/' || :'mp4_ticket_id' || '.webp');
select private.test_login('11111111-1111-1111-1111-111111111111');

select public.process_video_prompt_upload(:'mp4_ticket_id'::uuid, 'mp4'::text, 300::smallint, 300::smallint, 9000::integer, 'A Safari recording') as mp4_result \gset

select is(
  (select video_path from public.video_prompts where profile_id = '11111111-1111-1111-1111-111111111111'),
  'video-prompts/11111111-1111-1111-1111-111111111111/' || :'mp4_ticket_id' || '.mp4',
  'an mp4 upload (Safari) is stored with a .mp4 path, not renamed to .webm'
);

select ok(
  (:'mp4_result'::jsonb->>'oldVideoPath') like '%.webm',
  're-recording from webm to mp4 still returns the previous (webm) path for cleanup'
);

-- ===== re-recording upserts and returns old paths for the route to clean up =====

select public.create_upload_ticket('video_prompt'::public.upload_kind) as ticket2 \gset
select (:'ticket2'::jsonb->>'ticketId')::uuid as ticket2_id \gset
select public.begin_upload(:'ticket2_id'::uuid) as begun2 \gset

select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name)
values
  ('video-prompts', '11111111-1111-1111-1111-111111111111/' || :'ticket2_id' || '.webm'),
  ('video-prompts', '11111111-1111-1111-1111-111111111111/' || :'ticket2_id' || '.webp');
select private.test_login('11111111-1111-1111-1111-111111111111');

select public.process_video_prompt_upload(:'ticket2_id'::uuid, 'webm'::text, 300::smallint, 300::smallint, 8000::integer, 'What does family mean to you?') as result2 \gset

select ok(
  (:'result2'::jsonb->>'oldVideoPath') like 'video-prompts/%.mp4',
  're-recording again returns the immediately-previous (mp4) video path for cleanup'
);

select is(
  (select count(*)::int from public.video_prompts where profile_id = '11111111-1111-1111-1111-111111111111'),
  1,
  're-recording upserts the single video_prompts row rather than adding a second one'
);

-- ===== RLS: cross-user isolation and IDOR close, matching the photos pattern =====

select private.test_login('22222222-2222-2222-2222-222222222222');

select is(
  (select count(*)::int from public.video_prompts where profile_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'bob cannot select alice''s video_prompts row (no Phase 2 connection between them yet)'
);

select public.create_upload_ticket('video_prompt'::public.upload_kind) as bob_ticket \gset
select (:'bob_ticket'::jsonb->>'ticketId')::uuid as bob_ticket_id \gset

select private.test_login('11111111-1111-1111-1111-111111111111');

select throws_like(
  format('select public.begin_upload(%L::uuid)', :'bob_ticket_id'),
  '%ticket_not_found%',
  'alice cannot claim bob''s video_prompt upload ticket'
);

select * from finish();
rollback;
