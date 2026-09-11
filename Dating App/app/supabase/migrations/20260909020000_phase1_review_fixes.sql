-- Phase 1 review-cycle fixes (spec section 12: code review, then red-team,
-- then sane-mode). Every change here closes a specific finding from that
-- cycle; each is called out below with what broke and why. All of it is
-- additive/corrective on objects that only ever held test data so far --
-- nothing here has shipped to a real user yet -- so these are folded into
-- one migration rather than staged as a separate expand/contract pair.

-- ---------------------------------------------------------------------
-- 1. profile_sensitive/profile_private/profile_answers/preferences were
-- `FOR ALL` policies, which in Postgres also grants DELETE. Spec section
-- 6.3 says DELETE is `none` on all four (only profile_heritage and
-- heritage_preferences allow it). Split into explicit SELECT/INSERT/UPDATE,
-- dropping DELETE. profile_private additionally drops INSERT here (see
-- fix 6 below: creation now happens only through attempt_set_birth_date).
-- ---------------------------------------------------------------------

drop policy profile_sensitive_own on public.profile_sensitive;
create policy profile_sensitive_select_own on public.profile_sensitive
  for select using (profile_id = auth.uid());
create policy profile_sensitive_update_own on public.profile_sensitive
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy profile_private_own on public.profile_private;
create policy profile_private_select_own on public.profile_private
  for select using (profile_id = auth.uid());
create policy profile_private_update_own on public.profile_private
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy profile_answers_own on public.profile_answers;
create policy profile_answers_select_own on public.profile_answers
  for select using (profile_id = auth.uid());
create policy profile_answers_update_own on public.profile_answers
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy preferences_own on public.preferences;
create policy preferences_select_own on public.preferences
  for select using (profile_id = auth.uid());
create policy preferences_update_own on public.preferences
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. enforce_photo_limit counted rows before checking whether the INSERT
-- was actually a same-position replace (process_upload's
-- `on conflict (profile_id, position) do update`), which Postgres routes
-- through the BEFORE INSERT trigger before the conflict is resolved.
-- Replacing photo 1 through 6 while already at the 6-photo cap raised
-- `too_many_photos` for a legitimate, count-neutral action. Skip the count
-- check when a row already occupies this exact position.
-- ---------------------------------------------------------------------

create or replace function private.enforce_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  photo_count int;
begin
  if exists (
    select 1 from public.photos
    where profile_id = new.profile_id and position = new.position
  ) then
    return new;
  end if;

  select count(*) into photo_count from public.photos where profile_id = new.profile_id;
  if photo_count >= 6 then
    raise exception 'too_many_photos: at most 6 photos per profile';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. enforce_genotype_gate was bound to every profile_answers insert/
-- update, not just changes to genotype/health_section_enabled. Since NEW
-- carries the unchanged genotype value through on any unrelated edit,
-- withdrawing genotype consent after having set a genotype made every
-- later edit to any field in the row fail with genotype_requires_consent
-- until the user also manually nulled genotype. Scope the trigger to the
-- two columns it actually cares about.
-- ---------------------------------------------------------------------

drop trigger profile_answers_genotype_gate on public.profile_answers;
create trigger profile_answers_genotype_gate
  before insert or update of genotype, health_section_enabled on public.profile_answers
  for each row execute function private.enforce_genotype_gate();

-- ---------------------------------------------------------------------
-- 3b. profile_answers_sync_faith_key was bound `OF faith_label`, so an
-- UPDATE that touched only faith_key (not faith_label) never fired it --
-- confirmed live: PATCH {"faith_key":"sneaky_bogus"} left faith_label and
-- faith_key completely unrelated. faith_key is meant to be a derived,
-- read-only-from-the-client mirror of faith_label (spec 9.2's "normalised
-- so must-match comparisons work"); rebind with no column list, like
-- sync_heritage_value_key's sibling trigger, so it re-derives faith_key
-- from faith_label on every write regardless of which column was targeted.
-- ---------------------------------------------------------------------

drop trigger profile_answers_sync_faith_key on public.profile_answers;
create trigger profile_answers_sync_faith_key
  before insert or update on public.profile_answers
  for each row execute function private.sync_faith_key();

-- ---------------------------------------------------------------------
-- 4. sync_heritage_value_key's cap check counted the row's own pre-update
-- value_key as one of the "other" values on UPDATE, so renaming any one of
-- 5 existing values at the cap read existing_count = 5 and rejected a
-- rename that never actually increased the count. Exclude the row being
-- updated.
-- ---------------------------------------------------------------------

create or replace function private.sync_heritage_value_key()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing_count int;
begin
  new.value_key := private.normalize_key(new.value);

  select count(*) into existing_count
  from public.profile_heritage
  where profile_id = new.profile_id and field = new.field and value_key <> new.value_key
    and not (tg_op = 'UPDATE' and value_key = old.value_key);

  if existing_count >= 5 then
    raise exception 'too_many_heritage_values: at most 5 values per field';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Four preferences.*_must_needs_accept constraints, plus
-- heritage_preferences.accept_keys's range check, used bare
-- `array_length(x, 1) > 0`. Postgres's array_length on an empty array
-- returns NULL, not 0, and a NULL CHECK result is treated as satisfied --
-- so `kids_must = true, kids_accept = '{}'` (and the same for every
-- sibling column) silently passed, contradicting spec 5.2's explicit
-- "a must with an empty accept array is rejected by CHECK". Switch to
-- `coalesce(array_length(x, 1), 0) > 0`, which is NULL-safe.
-- ---------------------------------------------------------------------

alter table public.preferences drop constraint kids_must_needs_accept;
alter table public.preferences add constraint kids_must_needs_accept
  check (not kids_must or coalesce(array_length(kids_accept, 1), 0) > 0);

alter table public.preferences drop constraint faith_must_needs_accept;
alter table public.preferences add constraint faith_must_needs_accept
  check (not faith_key_must or coalesce(array_length(faith_key_accept, 1), 0) > 0);

alter table public.preferences drop constraint practice_must_needs_accept;
alter table public.preferences add constraint practice_must_needs_accept
  check (not practice_must or coalesce(array_length(practice_accept, 1), 0) > 0);

alter table public.preferences drop constraint politics_must_needs_accept;
alter table public.preferences add constraint politics_must_needs_accept
  check (not politics_must or coalesce(array_length(politics_accept, 1), 0) > 0);

alter table public.preferences drop constraint smoking_must_needs_accept;
alter table public.preferences add constraint smoking_must_needs_accept
  check (not smoking_must or coalesce(array_length(smoking_accept, 1), 0) > 0);

alter table public.preferences drop constraint drinking_must_needs_accept;
alter table public.preferences add constraint drinking_must_needs_accept
  check (not drinking_must or coalesce(array_length(drinking_accept, 1), 0) > 0);

alter table public.preferences drop constraint genotype_must_needs_accept;
alter table public.preferences add constraint genotype_must_needs_accept
  check (not genotype_must or coalesce(array_length(genotype_accept, 1), 0) > 0);

alter table public.heritage_preferences drop constraint heritage_preferences_accept_keys_check;
alter table public.heritage_preferences add constraint heritage_preferences_accept_keys_check
  check (coalesce(array_length(accept_keys, 1), 0) between 1 and 10);

-- ---------------------------------------------------------------------
-- 6. Under-18 attempts must be refused and logged without the date (spec
-- section 2.1). profile_private.birth_date was directly owner-writable,
-- so the client just upserted it and let the CHECK constraint reject an
-- underage date with no record of the attempt at all. birth_date now
-- becomes create-and-set only through this function; a matching trigger
-- (below) blocks any direct write to it, the same bypass-GUC pattern
-- profiles already uses for status/verified_at/age.
--
-- attempt_set_birth_date deliberately returns a result instead of raising
-- on the underage path, unlike every other Phase 1 function. A RAISE
-- EXCEPTION that reaches the caller aborts the whole enclosing
-- transaction -- which, one statement per PostgREST request, is exactly
-- the transaction the logging INSERT itself is part of. Raising here
-- would silently undo the very log row the spec requires; returning
-- {"ok": false, "code": "underage"} lets that transaction commit
-- normally while still telling the caller no. A real cross-transaction
-- log (dblink or similar) would let this function raise like its
-- siblings, but that's more standing infrastructure than a low-stakes
-- audit signal justifies -- noted in spec section 15.
-- ---------------------------------------------------------------------

create table private.age_gate_rejections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create or replace function private.enforce_profile_private_immutable_birth_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.bypass_profile_guard', true), '') = 'on' then
    return new;
  end if;
  if new.birth_date is distinct from old.birth_date then
    raise exception 'not_authorized: birth_date can only be set via attempt_set_birth_date';
  end if;
  return new;
end;
$$;

create trigger profile_private_enforce_immutable_birth_date
  before update on public.profile_private
  for each row execute function private.enforce_profile_private_immutable_birth_date();

create or replace function public.attempt_set_birth_date(p_birth_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_birth_date is null or p_birth_date > current_date - interval '18 years' then
    insert into private.age_gate_rejections (user_id) values (auth.uid());
    return jsonb_build_object('ok', false, 'code', 'underage');
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  insert into public.profile_private (profile_id, birth_date)
  values (auth.uid(), p_birth_date)
  on conflict (profile_id) do update set birth_date = excluded.birth_date;
  perform set_config('app.bypass_profile_guard', 'off', true);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.attempt_set_birth_date(date) from public, anon;
grant execute on function public.attempt_set_birth_date(date) to authenticated;

-- ---------------------------------------------------------------------
-- 7. validate_and_scan_prompts: (a) the flag write was a bare UPDATE with
-- no existence check, so a direct-API caller who sets prompts before
-- profile_private exists (nothing in the schema orders these two writes)
-- got the scan to run but the flag silently dropped on the floor; (b) the
-- regex never covered payment-app names despite spec 9.5 requiring it,
-- and mixed word-boundary usage (instagram had none, others did). Fixed:
-- raise instead of silently no-op-ing when flagged and profile_private is
-- missing; added venmo/cashapp/zelle/paypal with consistent boundaries;
-- run the match through unaccent() so basic diacritic-based evasion (not
-- full homoglyph resistance -- see spec section 15) doesn't slip past.
-- ---------------------------------------------------------------------

create or replace function private.validate_and_scan_prompts()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  elem jsonb;
  combined text := '';
  flagged boolean;
begin
  if new.prompts is null then
    return new;
  end if;

  if jsonb_typeof(new.prompts) <> 'array' or jsonb_array_length(new.prompts) <> 3 then
    raise exception 'invalid_prompts: exactly 3 prompt answers are required';
  end if;

  for elem in select * from jsonb_array_elements(new.prompts)
  loop
    if elem->>'prompt_id' is null or elem->>'answer' is null
       or char_length(elem->>'answer') < 1 or char_length(elem->>'answer') > 200 then
      raise exception 'invalid_prompts: each answer must be 1-200 characters';
    end if;
    combined := combined || ' ' || (elem->>'answer');
  end loop;

  flagged := extensions.unaccent(lower(combined)) ~*
    '@[a-z0-9_.]{2,}|\minstagram\M|\msnapchat\M|\mwhatsapp\M|\mtelegram\M'
    '|\mvenmo\M|\mcashapp\M|\mcash app\M|\mzelle\M|\mpaypal\M'
    '|\+?[0-9][0-9\-\s]{8,}[0-9]';

  if flagged then
    update public.profile_private
      set review_flags = review_flags || jsonb_build_object('social_handle', true)
      where profile_id = new.id;
    if not found then
      raise exception 'age_gate_required: complete the age step before adding prompts';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 7b. submit_for_review also left app.bypass_profile_guard set to 'on'
-- for the rest of its transaction after using it (harmless under
-- PostgREST's one-statement-per-transaction model, but needlessly wide;
-- reset it immediately once its own privileged write is done, same as
-- attempt_set_birth_date and admin_review_verification now do).
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

  if p.first_name is null or p.gender is null or p.city_label is null or p.prompts is null then
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
  perform set_config('app.bypass_profile_guard', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. create_upload_ticket's 20/day check was check-then-act: read
-- attempts_today, compare, then insert and increment in a separate
-- statement with no row lock, unlike the locking pattern spec 7.4
-- mandates for get_daily_feed for the same reason. A burst of concurrent
-- calls could all read the same pre-increment count and all pass. Make
-- the increment itself the atomic gate: UPDATE ... WHERE ... < 20
-- RETURNING, and treat a miss as the limit.
-- ---------------------------------------------------------------------

create or replace function public.create_upload_ticket(kind public.upload_kind, p_position smallint default null, verification_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
  obj_path text;
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
  obj_path := 'incoming/' || auth.uid()::text || '/' || ticket_id::text;

  insert into public.upload_tickets (id, user_id, kind, object_path, position, verification_id)
  values (ticket_id, auth.uid(), kind, obj_path, p_position, verification_id);

  return jsonb_build_object('ticketId', ticket_id, 'objectPath', obj_path);
end;
$$;

-- ---------------------------------------------------------------------
-- 9. process_upload only ever recorded that a processed image exists; it
-- never checked Storage actually agreed. Any authenticated user could
-- call begin_upload then process_upload directly, with no bytes ever
-- written to the photos/verification buckets, and satisfy
-- submit_for_review's "photo/selfie exists" preconditions with a
-- completely fabricated reference -- skipping the decompression-bomb
-- guard, EXIF strip, and real-content sniffing entirely, since nothing
-- ever gets decoded. Require the destination object to actually exist in
-- storage.objects (a plain table, readable from this SECURITY DEFINER
-- function) before recording it.
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
  object_name text;
  bucket text;
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

-- ---------------------------------------------------------------------
-- 10. admin_review_verification had no idempotency guard and didn't
-- reject a null decision. Two calls against the same verification_id
-- (a client double-click, or a retried request) could leave
-- verifications.decision and profiles.status disagreeing -- the second
-- call's profiles UPDATE silently no-ops once status has already moved
-- off pending_review, while the verifications UPDATE always applies last-
-- write-wins. A null p_decision made `if p_decision = 'approved'`
-- evaluate to NULL/false, silently taking the reject branch and writing
-- decision = NULL. Reject null up front; gate the verifications UPDATE on
-- decision still being null and raise `already_decided` otherwise.
-- ---------------------------------------------------------------------

create or replace function public.admin_review_verification(p_verification_id uuid, p_decision public.verification_decision, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  updated record;
begin
  if not private.is_admin_mfa(auth.uid()) then
    raise exception 'forbidden';
  end if;

  if p_decision is null then
    raise exception 'invalid_decision: decision is required';
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
    where id = p_verification_id and decision is null
    returning * into updated;

  if updated is null then
    raise exception 'already_decided: this verification has already been reviewed';
  end if;

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
  perform set_config('app.bypass_profile_guard', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 11. rate_limit_profile_edits ignored the same bypass GUC that
-- enforce_profile_immutable_columns respects, so submit_for_review's and
-- admin_review_verification's own status-changing UPDATEs on profiles
-- consumed the same 60-edits/hour counter as the user's own client-driven
-- edits -- a user who'd made 60 ordinary edits in the last hour would get
-- a spurious rate_limited error the moment they called submit_for_review,
-- for a reason unrelated to what the limiter polices. Skip counting when
-- the bypass is set, same as the immutable-columns guard already does.
-- ---------------------------------------------------------------------

create or replace function private.rate_limit_profile_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  counter record;
begin
  if coalesce(current_setting('app.bypass_profile_guard', true), '') = 'on' then
    return new;
  end if;

  insert into private.profile_edit_counters (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  select * into counter from private.profile_edit_counters where profile_id = new.id for update;

  if counter.window_started_at < now() - interval '1 hour' then
    update private.profile_edit_counters
      set window_started_at = now(), edits_in_window = 1
      where profile_id = new.id;
  else
    if counter.edits_in_window >= 60 then
      raise exception 'rate_limited: too many profile edits, try again shortly';
    end if;
    update private.profile_edit_counters
      set edits_in_window = edits_in_window + 1
      where profile_id = new.id;
  end if;
  return new;
end;
$$;
