-- Phase 1 pgTAP suite (spec section 11.1). Covers the negative-authorization
-- properties Phase 1 actually has objects for: cross-user isolation on the
-- owner-only tables, the profiles visibility gate, the upload-ticket IDOR
-- close, and the admin aal2 gate. Ranking/matching/connection tests belong
-- to Phase 2's own suite once those tables exist.
begin;
select plan(17);

-- ---------------------------------------------------------------------
-- Fixtures: three real users via the same auth.users path a real signup
-- takes, so the on_auth_user_created trigger is exercised exactly as
-- production would exercise it, not approximated.
-- ---------------------------------------------------------------------
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

insert into public.admins (user_id) values ('33333333-3333-3333-3333-333333333333');

select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'on_auth_user_created creates a profiles row for a new auth.users row'
);

select is(
  (select count(*)::int from public.profile_sensitive where profile_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'on_auth_user_created creates a profile_sensitive row'
);

-- ---------------------------------------------------------------------
-- Helper to simulate a signed-in request the way PostgREST would present
-- it: `authenticated` role, a JWT with a real sub and aal.
-- ---------------------------------------------------------------------
-- Plain function, deliberately NOT security definer: Postgres refuses to
-- let a SECURITY DEFINER function change the `role` GUC at all, precisely
-- to prevent this kind of role-switching from being used as a privilege
-- escalation trick. The pgTAP harness itself runs as postgres (a superuser,
-- a member of every role), so no elevation is needed here in the first
-- place -- discovered by Postgres refusing the first version outright,
-- not by reasoning about it in advance.
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

-- ===== profile_sensitive, profile_answers, preferences: owner-only =====

select private.test_login('11111111-1111-1111-1111-111111111111');
update public.profile_sensitive set seeking = 'men' where profile_id = auth.uid();
update public.profile_answers set goal = 'marriage' where profile_id = auth.uid();

select private.test_login('22222222-2222-2222-2222-222222222222');
update public.profile_sensitive set seeking = 'women' where profile_id = auth.uid();

select private.test_login('11111111-1111-1111-1111-111111111111');

select is(
  (select count(*)::int from public.profile_sensitive where profile_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice cannot select bobs profile_sensitive row'
);

select is(
  (select count(*)::int from public.profile_answers where profile_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice cannot select bobs profile_answers row'
);

select is(
  (select count(*)::int from public.preferences where profile_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice cannot select bobs preferences row'
);

-- ===== likes-style zero-access table pattern: upload_tickets =====
-- upload_tickets has no policy at all for any role (spec section 6.3);
-- confirm that holds even for the ticket owner via a raw SELECT.

select public.create_upload_ticket('photo'::public.upload_kind, 1::smallint, null::uuid) as ticket \gset
select is(
  (select count(*)::int from public.upload_tickets where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'even the ticket owner cannot SELECT upload_tickets directly; function-only access holds'
);

-- ===== can_view_profile: self, not-a-stranger, admin =====

select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice can see her own profile row'
);

select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice cannot see bobs profile row (no connection, no feed item, no like -- none of those exist yet)'
);

select private.test_login('33333333-3333-3333-3333-333333333333', 'aal2');
select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'an aal2 admin can see any profile row'
);

select private.test_login('33333333-3333-3333-3333-333333333333', 'aal1');
select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'the same admin WITHOUT aal2 cannot see another users profile row'
);

-- ===== admin-only tables require is_admin_mfa, not merely is_admin =====

select is(
  (select count(*)::int from public.admins),
  0,
  'an admin without aal2 cannot even SELECT the admins table'
);

select private.test_login('33333333-3333-3333-3333-333333333333', 'aal2');
select is(
  (select count(*)::int from public.admins),
  1,
  'the same admin WITH aal2 can select the admins table'
);

select private.test_login('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.admins),
  0,
  'a non-admin cannot select the admins table under any aal'
);

-- ===== admin_review_verification requires aal2 (spec section 6.5, 9.1) =====

select private.test_login('33333333-3333-3333-3333-333333333333', 'aal1');
select throws_like(
  $$ select public.admin_review_verification(gen_random_uuid(), 'approved'::public.verification_decision, null) $$,
  '%forbidden%',
  'admin_review_verification refuses an admin session without aal2'
);

-- ===== IDOR close on begin_upload: a ticket belongs to its creator only =====

select private.test_login('22222222-2222-2222-2222-222222222222');
select public.create_upload_ticket('photo'::public.upload_kind, 2::smallint, null::uuid) as bob_ticket \gset
select (:'bob_ticket'::jsonb->>'ticketId')::uuid as bob_ticket_id \gset

select private.test_login('11111111-1111-1111-1111-111111111111');
select throws_like(
  format('select public.begin_upload(%L::uuid)', :'bob_ticket_id'),
  '%ticket_not_found%',
  'alice cannot claim a ticket that belongs to bob'
);

-- ===== private schema is genuinely unreachable to authenticated, not just undocumented =====
-- is_admin is the one private helper granted to nobody at all (spec section
-- 6.5): only ever called from inside is_admin_mfa's own SECURITY DEFINER
-- body. A direct call as `authenticated` must fail on privilege, not run.

select throws_ok(
  $$ select private.is_admin('11111111-1111-1111-1111-111111111111'::uuid) $$,
  '42501',
  null,
  'private.is_admin is not directly callable by authenticated (insufficient_privilege)'
);

-- ===== submit_for_review gates on real preconditions, not just auth =====

select private.test_login('22222222-2222-2222-2222-222222222222');
select throws_like(
  $$ select public.submit_for_review() $$,
  '%missing%',
  'submit_for_review refuses an incomplete profile with a named reason'
);

select * from finish();
rollback;
