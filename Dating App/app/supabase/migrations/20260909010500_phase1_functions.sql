-- Phase 1: the public RPC surface (spec sections 7.16-7.18, 7.28-7.30).
--
-- Implementation note on begin_upload/process_upload not in the spec prose:
-- the destination Storage path has to be known to the calling route BEFORE
-- it uploads the processed file (so it knows where to write), which means
-- process_upload cannot be the one to invent it after the fact. begin_upload
-- computes it deterministically from the ticket's own id (reused as the
-- resulting photo's id for photo uploads, and the existing verification_id
-- for selfies), so it's never a client-supplied value and never needs a
-- second id generated later. process_upload recomputes the same path from
-- the same inputs rather than trusting whatever the route hands back.

create or replace function public.record_consent(kind public.consent_kind, version text, action public.consent_action)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.consent_events (profile_id, kind, version, action)
  values (auth.uid(), kind, version, action);
end;
$$;

revoke all on function public.record_consent(public.consent_kind, text, public.consent_action) from public, anon;
grant execute on function public.record_consent(public.consent_kind, text, public.consent_action) to authenticated;

-- ---------------------------------------------------------------------
create or replace function public.start_verification()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  poses text[] := array['look_left', 'look_right', 'peace_sign', 'thumbs_up', 'touch_nose'];
  chosen_pose text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if (select status from public.profiles where id = auth.uid()) not in ('onboarding') then
    raise exception 'not_onboarding';
  end if;

  chosen_pose := poses[1 + floor(random() * array_length(poses, 1))::int];
  new_id := gen_random_uuid();

  insert into public.verifications (id, profile_id, pose_code)
  values (new_id, auth.uid(), chosen_pose);

  return jsonb_build_object('verificationId', new_id, 'poseCode', chosen_pose);
end;
$$;

revoke all on function public.start_verification() from public, anon;
grant execute on function public.start_verification() to authenticated;

-- ---------------------------------------------------------------------
-- `position` is a reserved word in this grammar position (it collides with
-- the POSITION(substring IN string) function syntax) and cannot be used as
-- a bare parameter name here, unlike as an ordinary column name, which is
-- why the table itself could be called `position` but this signature can't
-- use it directly; caught by Postgres refusing to parse the migration at
-- all, not silently.
create or replace function public.create_upload_ticket(kind public.upload_kind, p_position smallint default null, verification_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
  obj_path text;
  attempts_today int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if kind = 'photo' and (p_position is null or p_position < 1 or p_position > 6) then
    raise exception 'invalid_position';
  end if;

  if kind = 'selfie' then
    if verification_id is null then
      raise exception 'missing_verification_id';
    end if;
    if not exists (
      select 1 from public.verifications v
      where v.id = verification_id and v.profile_id = auth.uid() and v.decision is null
    ) then
      raise exception 'invalid_verification';
    end if;
  end if;

  insert into public.user_daily (user_id, day) values (auth.uid(), current_date)
    on conflict (user_id, day) do nothing;

  select photo_uploads into attempts_today
  from public.user_daily where user_id = auth.uid() and day = current_date;

  if attempts_today >= 20 then
    raise exception 'daily_upload_limit';
  end if;

  ticket_id := gen_random_uuid();
  obj_path := 'incoming/' || auth.uid()::text || '/' || ticket_id::text;

  insert into public.upload_tickets (id, user_id, kind, object_path, position, verification_id)
  values (ticket_id, auth.uid(), kind, obj_path, p_position, verification_id);

  update public.user_daily set photo_uploads = photo_uploads + 1
    where user_id = auth.uid() and day = current_date;

  return jsonb_build_object('ticketId', ticket_id, 'objectPath', obj_path);
end;
$$;

revoke all on function public.create_upload_ticket(public.upload_kind, smallint, uuid) from public, anon;
grant execute on function public.create_upload_ticket(public.upload_kind, smallint, uuid) to authenticated;

-- ---------------------------------------------------------------------
create or replace function public.begin_upload(ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  dest_path text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.upload_tickets
    set claimed_at = now()
    where id = ticket_id
      and user_id = auth.uid()
      and claimed_at is null
      and used_at is null
      and expires_at > now()
    returning * into t;

  if t is null then
    if exists (select 1 from public.upload_tickets where id = ticket_id and user_id = auth.uid() and used_at is not null) then
      raise exception 'ticket_used';
    elsif exists (select 1 from public.upload_tickets where id = ticket_id and user_id = auth.uid() and claimed_at is not null) then
      raise exception 'already_claimed';
    elsif exists (select 1 from public.upload_tickets where id = ticket_id and user_id = auth.uid() and expires_at <= now()) then
      raise exception 'ticket_expired';
    else
      -- deliberately the same error whether the ticket belongs to someone
      -- else or doesn't exist at all (spec section 9.9)
      raise exception 'ticket_not_found';
    end if;
  end if;

  dest_path := case
    when t.kind = 'photo' then 'photos/' || auth.uid()::text || '/' || t.id::text || '.webp'
    else 'verification/' || auth.uid()::text || '/' || t.verification_id::text || '.webp'
  end;

  return jsonb_build_object(
    'kind', t.kind,
    'objectPath', t.object_path,
    'destPath', dest_path,
    'position', t.position,
    'verificationId', t.verification_id
  );
end;
$$;

revoke all on function public.begin_upload(uuid) from public, anon;
grant execute on function public.begin_upload(uuid) to authenticated;

-- ---------------------------------------------------------------------
create or replace function public.process_upload(ticket_id uuid, width smallint default null, height smallint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  dest_path text;
  old_path text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into t from public.upload_tickets
    where id = ticket_id and user_id = auth.uid() and claimed_at is not null and used_at is null;

  if t is null then
    if exists (select 1 from public.upload_tickets where id = ticket_id and user_id = auth.uid() and used_at is not null) then
      raise exception 'ticket_used';
    elsif exists (select 1 from public.upload_tickets where id = ticket_id and user_id = auth.uid()) then
      raise exception 'not_claimed';
    else
      raise exception 'ticket_not_found';
    end if;
  end if;

  if t.kind = 'photo' then
    dest_path := 'photos/' || auth.uid()::text || '/' || t.id::text || '.webp';

    select storage_path into old_path from public.photos
      where profile_id = auth.uid() and position = t.position;

    insert into public.photos (id, profile_id, position, storage_path, width, height)
    values (t.id, auth.uid(), t.position, dest_path, width, height)
    on conflict (profile_id, position) do update
      set id = excluded.id, storage_path = excluded.storage_path,
          width = excluded.width, height = excluded.height;
  else
    dest_path := 'verification/' || auth.uid()::text || '/' || t.verification_id::text || '.webp';

    update public.verifications
      set selfie_path = dest_path
      where id = t.verification_id and profile_id = auth.uid();
  end if;

  update public.upload_tickets set used_at = now() where id = ticket_id;

  -- old_path, if not null, is a now-orphaned Storage object at a
  -- different id (a photo was replaced at the same position); the
  -- calling route deletes it with the secret key. This function never
  -- touches Storage itself.
  return jsonb_build_object('storagePath', dest_path, 'oldStoragePath', old_path);
end;
$$;

revoke all on function public.process_upload(uuid, smallint, smallint) from public, anon;
grant execute on function public.process_upload(uuid, smallint, smallint) to authenticated;

-- ---------------------------------------------------------------------
create or replace function public.submit_for_review()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  a record;
  s record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into p from public.profiles where id = auth.uid();
  if p.status <> 'onboarding' then
    raise exception 'already_submitted';
  end if;

  select * into s from public.profile_sensitive where profile_id = auth.uid();
  select * into a from public.profile_answers where profile_id = auth.uid();

  if p.first_name is null or p.gender is null or p.city_label is null then
    raise exception 'missing_basics';
  end if;

  if s.seeking is null or a.goal is null then
    raise exception 'missing_non_negotiables';
  end if;

  if not exists (select 1 from public.photos where profile_id = auth.uid() and position = 1) then
    raise exception 'missing_photo';
  end if;

  if not private.has_current_consent(auth.uid(), 'terms', '1')
     or not private.has_current_consent(auth.uid(), 'privacy', '1')
     or not private.has_current_consent(auth.uid(), 'sensitive_data', '1') then
    raise exception 'missing_consent';
  end if;

  if not exists (
    select 1 from public.verifications
    where profile_id = auth.uid() and selfie_path is not null and decision is null
  ) then
    raise exception 'missing_verification_photo';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set status = 'pending_review' where id = auth.uid();
end;
$$;

revoke all on function public.submit_for_review() from public, anon;
grant execute on function public.submit_for_review() to authenticated;

-- ---------------------------------------------------------------------
-- admin_review_verification: the minimum admin function Phase 1 needs so
-- the exit criterion ("approved by an aal2-enrolled admin") is actually
-- reachable. admin_review_report, admin_ban_user, and admin_reinstate_user
-- are Phase 4 functions (spec section 14) and are not needed until reports
-- exist.
-- ---------------------------------------------------------------------
-- Parameters are prefixed (p_decision, p_note) rather than named after the
-- columns they set: plpgsql does not let `function_name.column` disambiguate
-- a same-named parameter from a table column inside an UPDATE ... SET, and
-- an earlier draft of this function relied on syntax that isn't valid at
-- all, which would have failed the first time it ran, not silently.
create or replace function public.admin_review_verification(p_verification_id uuid, p_decision public.verification_decision, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  if not private.is_admin_mfa(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into v from public.verifications where id = p_verification_id;
  if v is null then
    raise exception 'not_found';
  end if;

  insert into public.admin_audit (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'review_verification', 'verification', p_verification_id,
          jsonb_build_object('decision', p_decision, 'note', p_note));

  update public.verifications
    set decision = p_decision,
        decided_at = now(),
        reviewer_id = auth.uid(),
        note = p_note
    where id = p_verification_id;

  perform set_config('app.bypass_profile_guard', 'on', true);
  if p_decision = 'approved' then
    update public.profiles
      set status = 'active', verified_at = now()
      where id = v.profile_id and status = 'pending_review';
  else
    update public.profiles
      set status = 'onboarding'
      where id = v.profile_id and status = 'pending_review';
  end if;
end;
$$;

revoke all on function public.admin_review_verification(uuid, public.verification_decision, text) from public, anon;
grant execute on function public.admin_review_verification(uuid, public.verification_decision, text) to authenticated;
