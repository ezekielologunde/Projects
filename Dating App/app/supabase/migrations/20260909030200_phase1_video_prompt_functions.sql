-- Phase 1: the video prompt's RPC surface (spec sections 7.16, 7.17,
-- 7.17a, 7.30). create_upload_ticket and begin_upload are extended in
-- place (same signature, same function identity); process_upload gains a
-- guard against being called on the wrong kind; process_video_prompt_upload
-- is new.
--
-- create_upload_ticket is rebuilt on top of the ALREADY-FIXED version from
-- 20260909020000_phase1_review_fixes.sql (its fix #8's atomic
-- update-where-returning daily-limit gate, and its unexpected_verification_id
-- guard), not the original 20260909010500_phase1_functions.sql version --
-- copying the wrong base here would have silently reintroduced both a TOCTOU
-- race on the 20/day limit and a dropped validation check, for every kind,
-- not just video_prompt. Caught in this feature's own review cycle before
-- it shipped.

create or replace function public.create_upload_ticket(kind public.upload_kind, p_position smallint default null, verification_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
  obj_path text;
  poster_path text;
  claimed record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if kind = 'photo' and (p_position is null or p_position < 1 or p_position > 6) then
    raise exception 'invalid_position';
  end if;

  if kind = 'photo' and verification_id is not null then
    raise exception 'unexpected_verification_id: a photo ticket does not take a verification id';
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

  update public.user_daily
    set photo_uploads = photo_uploads + 1
    where user_id = auth.uid() and day = current_date and photo_uploads < 20
    returning * into claimed;

  if claimed is null then
    raise exception 'daily_upload_limit';
  end if;

  ticket_id := gen_random_uuid();

  if kind = 'video_prompt' then
    obj_path := 'video-incoming/' || auth.uid()::text || '/' || ticket_id::text;
    poster_path := 'incoming/' || auth.uid()::text || '/' || ticket_id::text || '-poster';
  else
    obj_path := 'incoming/' || auth.uid()::text || '/' || ticket_id::text;
    poster_path := null;
  end if;

  insert into public.upload_tickets (id, user_id, kind, object_path, poster_object_path, position, verification_id)
  values (ticket_id, auth.uid(), kind, obj_path, poster_path, p_position, verification_id);

  if kind = 'video_prompt' then
    return jsonb_build_object('ticketId', ticket_id, 'objectPath', obj_path, 'posterObjectPath', poster_path);
  end if;
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
  poster_dest_path text;
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

  -- video_prompt's dest_path is a .webm placeholder only: the real
  -- extension depends on which container the raw bytes actually turn out
  -- to be (WebM everywhere, MP4 on Safari), which isn't known until the
  -- route downloads and sniffs them, after this call. The calling route
  -- does not use this field for video_prompt; process_video_prompt_upload
  -- (7.17a) computes and owns the real destination from the sniffed
  -- video_format instead.
  dest_path := case
    when t.kind = 'photo' then 'photos/' || auth.uid()::text || '/' || t.id::text || '.webp'
    when t.kind = 'video_prompt' then 'video-prompts/' || auth.uid()::text || '/' || t.id::text || '.webm'
    else 'verification/' || auth.uid()::text || '/' || t.verification_id::text || '.webp'
  end;

  if t.kind = 'video_prompt' then
    poster_dest_path := 'video-prompts/' || auth.uid()::text || '/' || t.id::text || '.webp';
  end if;

  return jsonb_build_object(
    'kind', t.kind,
    'objectPath', t.object_path,
    'posterObjectPath', t.poster_object_path,
    'destPath', dest_path,
    'posterDestPath', poster_dest_path,
    'position', t.position,
    'verificationId', t.verification_id
  );
end;
$$;

revoke all on function public.begin_upload(uuid) from public, anon;
grant execute on function public.begin_upload(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- process_upload now rejects a video_prompt ticket explicitly (it would
-- otherwise fall into the `else` / selfie branch below and silently
-- corrupt a verifications row that t.verification_id doesn't even
-- point at, since video_prompt tickets never set verification_id).
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
  bucket text;
  object_name text;
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

  if t.kind = 'video_prompt' then
    raise exception 'wrong_kind: use process_video_prompt_upload for a video_prompt ticket';
  end if;

  if t.kind = 'photo' then
    bucket := 'photos';
    object_name := auth.uid()::text || '/' || t.id::text || '.webp';
    dest_path := bucket || '/' || object_name;
  else
    bucket := 'verification';
    object_name := auth.uid()::text || '/' || t.verification_id::text || '.webp';
    dest_path := bucket || '/' || object_name;
  end if;

  if not exists (select 1 from storage.objects where bucket_id = bucket and name = object_name) then
    raise exception 'object_not_uploaded: the processed image was not found in storage';
  end if;

  if t.kind = 'photo' then
    select storage_path into old_path from public.photos
      where profile_id = auth.uid() and position = t.position;

    insert into public.photos (id, profile_id, position, storage_path, width, height)
    values (t.id, auth.uid(), t.position, dest_path, width, height)
    on conflict (profile_id, position) do update
      set id = excluded.id, storage_path = excluded.storage_path,
          width = excluded.width, height = excluded.height;
  else
    update public.verifications
      set selfie_path = dest_path
      where id = t.verification_id and profile_id = auth.uid();
  end if;

  update public.upload_tickets set used_at = now() where id = ticket_id;

  return jsonb_build_object('storagePath', dest_path, 'oldStoragePath', old_path);
end;
$$;

revoke all on function public.process_upload(uuid, smallint, smallint) from public, anon;
grant execute on function public.process_upload(uuid, smallint, smallint) to authenticated;

-- ---------------------------------------------------------------------
create or replace function public.process_video_prompt_upload(ticket_id uuid, video_format text default null, poster_width smallint default null, poster_height smallint default null, duration_ms integer default null, prompt_text text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  video_dest text;
  poster_dest text;
  old_video_path text;
  old_poster_path text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if prompt_text is null or char_length(prompt_text) < 1 or char_length(prompt_text) > 200 then
    raise exception 'invalid_prompt_text';
  end if;

  -- video_format is accepted directly, the same trust level as
  -- poster_width/poster_height: it names which container the calling
  -- route already sniffed from the real bytes (spec section 0.14), not a
  -- path, so there's nothing here for an IDOR-style server-side
  -- derivation to protect that this whitelist doesn't already cover.
  if video_format is null or video_format not in ('webm', 'mp4') then
    raise exception 'invalid_video_format';
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

  if t.kind <> 'video_prompt' then
    raise exception 'wrong_kind: use process_upload for a photo or selfie ticket';
  end if;

  video_dest := 'video-prompts/' || auth.uid()::text || '/' || t.id::text || '.' || video_format;
  poster_dest := 'video-prompts/' || auth.uid()::text || '/' || t.id::text || '.webp';

  if not exists (select 1 from storage.objects where bucket_id = 'video-prompts' and name = auth.uid()::text || '/' || t.id::text || '.' || video_format) then
    raise exception 'object_not_uploaded: the processed video was not found in storage';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'video-prompts' and name = auth.uid()::text || '/' || t.id::text || '.webp') then
    raise exception 'object_not_uploaded: the processed poster frame was not found in storage';
  end if;

  select video_path, poster_path into old_video_path, old_poster_path
    from public.video_prompts where profile_id = auth.uid();

  insert into public.video_prompts (profile_id, video_path, poster_path, poster_width, poster_height, duration_ms, prompt_text)
  values (auth.uid(), video_dest, poster_dest, poster_width, poster_height, duration_ms, prompt_text)
  on conflict (profile_id) do update
    set video_path = excluded.video_path, poster_path = excluded.poster_path,
        poster_width = excluded.poster_width, poster_height = excluded.poster_height,
        duration_ms = excluded.duration_ms, prompt_text = excluded.prompt_text;

  update public.upload_tickets set used_at = now() where id = ticket_id;

  -- old_video_path/old_poster_path are non-null only when this profile
  -- already had a video prompt (now replaced, at a different id than the
  -- new ticket's since t.id is freshly generated per ticket); the calling
  -- route deletes them from Storage the same way process_upload's
  -- oldStoragePath is deleted for a replaced photo.
  return jsonb_build_object(
    'videoPath', video_dest, 'posterPath', poster_dest,
    'oldVideoPath', old_video_path, 'oldPosterPath', old_poster_path
  );
end;
$$;

revoke all on function public.process_video_prompt_upload(uuid, text, smallint, smallint, integer, text) from public, anon;
grant execute on function public.process_video_prompt_upload(uuid, text, smallint, smallint, integer, text) to authenticated;
