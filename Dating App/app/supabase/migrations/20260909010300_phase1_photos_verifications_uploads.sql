-- Phase 1: photos, verifications, upload_tickets, and the three Storage
-- buckets they use (spec sections 5.2, 6.4).

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position between 1 and 6),
  storage_path text not null check (storage_path ~ '^photos/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  width smallint,
  height smallint,
  created_at timestamptz not null default now(),
  unique (profile_id, position)
);

alter table public.photos enable row level security;

create or replace function private.enforce_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  photo_count int;
begin
  select count(*) into photo_count from public.photos where profile_id = new.profile_id;
  if photo_count >= 6 then
    raise exception 'too_many_photos: at most 6 photos per profile';
  end if;
  return new;
end;
$$;

create trigger photos_enforce_limit
  before insert on public.photos
  for each row execute function private.enforce_photo_limit();

create policy photos_select_viewable on public.photos
  for select
  using (private.can_view_profile(auth.uid(), profile_id));

create policy photos_delete_own on public.photos
  for delete
  using (profile_id = auth.uid());
-- No INSERT/UPDATE policy for authenticated: photos rows are written only
-- by process_upload() (SECURITY DEFINER), never by a direct client insert,
-- matching spec section 6.3.

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  pose_code text not null,
  selfie_path text check (selfie_path is null or selfie_path ~ '^verification/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decision public.verification_decision,
  reviewer_id uuid references public.admins (user_id),
  note text check (char_length(note) <= 300)
);

alter table public.verifications enable row level security;

create or replace function private.enforce_verification_daily_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today_count int;
begin
  select count(*) into today_count
  from public.verifications
  where profile_id = new.profile_id and submitted_at::date = current_date;

  if today_count >= 3 then
    raise exception 'too_many_verification_attempts: at most 3 per day';
  end if;
  return new;
end;
$$;

create trigger verifications_enforce_daily_limit
  before insert on public.verifications
  for each row execute function private.enforce_verification_daily_limit();

create policy verifications_select_own_or_admin on public.verifications
  for select
  using (profile_id = auth.uid() or private.is_admin_mfa(auth.uid()));
-- No INSERT/UPDATE policy for authenticated: rows are created only by
-- start_verification() and updated only by process_upload() or
-- admin_review_verification() (all SECURITY DEFINER), matching spec
-- section 6.3.

-- Profiles cannot move to pending_review without a position-1 photo (spec
-- section 5.2: "position 1 required before status can become
-- pending_review"). submit_for_review() checks this too, with a named
-- error; this is the hard backstop regardless of call path.
create or replace function private.enforce_pending_review_requires_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'pending_review' and old.status is distinct from new.status then
    if not exists (select 1 from public.photos where profile_id = new.id and position = 1) then
      raise exception 'missing_photo: a photo at position 1 is required before submitting for review';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_require_photo_for_review
  before update on public.profiles
  for each row execute function private.enforce_pending_review_requires_photo();

create table public.upload_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.upload_kind not null,
  object_path text not null,
  position smallint check (position between 1 and 6),
  verification_id uuid references public.verifications (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  claimed_at timestamptz,
  used_at timestamptz,
  constraint photo_ticket_needs_position check (kind <> 'photo' or position is not null),
  constraint selfie_ticket_needs_verification check (kind <> 'selfie' or verification_id is not null)
);

create index upload_tickets_user_used_idx on public.upload_tickets (user_id, used_at);

alter table public.upload_tickets enable row level security;
-- No policy at all, for any role, matching spec section 6.3: "none for
-- users" across every operation. All access is through
-- create_upload_ticket(), begin_upload(), and process_upload(), each
-- SECURITY DEFINER.

-- ---------------------------------------------------------------------
-- Storage buckets (spec section 6.4). Public URL access is disabled on
-- all three (public = false); the only reads are through Storage's
-- authenticated API, gated by the policies below.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('incoming', 'incoming', false, 15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('photos', 'photos', false, null, array['image/webp']),
  ('verification', 'verification', false, null, array['image/webp'])
on conflict (id) do nothing;

-- incoming: owner may write to their own folder (defense in depth
-- alongside the signed-upload-URL token itself); nobody but the secret
-- key reads or deletes, which needs no policy since service_role
-- requests bypass RLS entirely and no policy exists to grant anyone else
-- that access.
create policy incoming_insert_own_folder on storage.objects
  for insert
  with check (bucket_id = 'incoming' and (storage.foldername(name))[1] = auth.uid()::text);

-- photos: viewable under the same single gate as the profile row itself;
-- the owner may delete their own; nobody inserts directly (process_upload
-- writes via the secret key).
create policy photos_bucket_select_viewable on storage.objects
  for select
  using (
    bucket_id = 'photos'
    and private.can_view_profile(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy photos_bucket_delete_own on storage.objects
  for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- verification: admin (aal2) read only. No authenticated insert or
-- delete; both happen via the secret key.
create policy verification_bucket_select_admin_only on storage.objects
  for select
  using (bucket_id = 'verification' and private.is_admin_mfa(auth.uid()));
