-- Phase 1: the optional video prompt (spec sections 0.12, 0.14, 5.1, 5.2,
-- 6.4, 7.16, 7.17, 7.17a, 7.30). Extends the existing photo/selfie upload
-- pipeline rather than forking it: create_upload_ticket and begin_upload
-- gain a third kind in place; only the "finish" step is a new function,
-- since its effect (upsert video_prompts) has different shape than
-- process_upload's insert-into-photos-at-a-position. The 'video_prompt'
-- enum value itself was added in the previous migration file (see its
-- header comment for why it can't be added and used in the same one).

-- ---------------------------------------------------------------------
-- video_prompts: at most one per profile, mirroring how `verifications`
-- is one-per-attempt but keyed differently -- this is keyed directly on
-- profile_id since there is never more than one live video prompt.
-- ---------------------------------------------------------------------

create table public.video_prompts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  -- .webm or .mp4: MediaRecorder produces WebM everywhere except Safari,
  -- which produces MP4 (wizard.tsx tries webm first, falls back to mp4).
  -- The extension always matches the container actually sniffed from the
  -- uploaded bytes server-side, never assumed from the client.
  video_path text not null check (video_path ~ '^video-prompts/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|mp4)$'),
  poster_path text not null check (poster_path ~ '^video-prompts/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  poster_width smallint,
  poster_height smallint,
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 30000),
  prompt_text text not null check (char_length(prompt_text) between 1 and 200),
  created_at timestamptz not null default now()
);

alter table public.video_prompts enable row level security;

create policy video_prompts_select_viewable on public.video_prompts
  for select
  using (private.can_view_profile(auth.uid(), profile_id));

create policy video_prompts_delete_own on public.video_prompts
  for delete
  using (profile_id = auth.uid());
-- No INSERT/UPDATE policy for authenticated: written only by
-- process_video_prompt_upload() (SECURITY DEFINER), same discipline as
-- `photos` (spec section 6.3).

-- ---------------------------------------------------------------------
-- upload_tickets gains poster_object_path, required exactly for
-- video_prompt tickets (their raw poster frame, uploaded to `incoming`
-- alongside the raw video in `video-incoming`).
-- ---------------------------------------------------------------------

alter table public.upload_tickets
  add column poster_object_path text;

alter table public.upload_tickets
  add constraint video_ticket_needs_poster
  check (kind <> 'video_prompt' or poster_object_path is not null);

-- ---------------------------------------------------------------------
-- Storage buckets (spec section 6.4). video-incoming is deliberately
-- separate from incoming, not a widened version of it: raising a size
-- ceiling for video must never also raise what an "image" upload to the
-- existing path is allowed to be.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('video-incoming', 'video-incoming', false, 26214400, array['video/webm', 'video/mp4']),
  ('video-prompts', 'video-prompts', false, null, array['video/webm', 'video/mp4', 'image/webp'])
on conflict (id) do nothing;

-- video-incoming: owner may write to their own folder, same shape as
-- `incoming`; nobody but the secret key reads or deletes.
create policy video_incoming_insert_own_folder on storage.objects
  for insert
  with check (bucket_id = 'video-incoming' and (storage.foldername(name))[1] = auth.uid()::text);

-- video-prompts: viewable under the same single gate as the profile row
-- itself; the owner may delete their own; nobody inserts directly
-- (process_video_prompt_upload's calling route writes via the secret
-- key). Holds both the video and its .webp poster frame side by side, so
-- the allowlist above covers both.
create policy video_prompts_bucket_select_viewable on storage.objects
  for select
  using (
    bucket_id = 'video-prompts'
    and private.can_view_profile(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy video_prompts_bucket_delete_own on storage.objects
  for delete
  using (bucket_id = 'video-prompts' and (storage.foldername(name))[1] = auth.uid()::text);
