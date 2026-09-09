-- Phase 1: the four section 7.25 scheduled jobs whose tables already exist
-- in this phase (spec section 0.18): refresh_ages, purge_upload_tickets,
-- purge_incoming, purge_verification_selfies. The rest of section 7.25
-- (expire_likes, connection_inactivity, purge_feed_items,
-- purge_ended_messages, purge_date_plans, purge_deleted_accounts) stays
-- deferred to the phase that builds its target table, unchanged by this
-- migration.
--
-- Two different mechanisms, matching what each job actually touches:
-- refresh_ages and purge_upload_tickets only ever write to ordinary
-- Postgres tables, so they are plain pg_cron jobs, exactly as section 7.25's
-- table header says. purge_incoming and purge_verification_selfies delete
-- real Storage bytes, which pg_cron cannot do directly -- storage.objects
-- carries a BEFORE DELETE trigger (storage.protect_delete()) that refuses a
-- raw SQL DELETE with "Direct deletion from storage tables is not allowed.
-- Use the Storage API instead", confirmed by reading that trigger on the
-- running local stack before this migration was written, not assumed. So
-- those two are only ever listed here as service_role-only functions that
-- list (or, for the selfie path, clear) rows; the actual Storage.remove()
-- call happens in the Next.js cron routes (/api/cron/purge-incoming,
-- /api/cron/purge) using the secret key, the same way processUploadedImage
-- and processUploadedVideoPrompt already delete Storage bytes.

create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------
-- refresh_ages (daily 03:00): the nightly counterpart to
-- private.sync_profile_age()'s trigger (20260909010200), which only fires
-- when birth_date itself is written. A birthday passing doesn't write
-- birth_date, so age would otherwise drift silently until the next edit.
-- Anticipated by name in that migration's immutable-columns comment; never
-- built until now.
-- ---------------------------------------------------------------------

create or replace function private.refresh_ages()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles p
    set age = floor(extract(year from age(current_date, pp.birth_date)))::smallint
    from public.profile_private pp
    where pp.profile_id = p.id
      and p.age is distinct from floor(extract(year from age(current_date, pp.birth_date)))::smallint;
  perform set_config('app.bypass_profile_guard', 'off', true);
end;
$$;

select cron.schedule('refresh_ages', '0 3 * * *', $$select private.refresh_ages()$$);

-- ---------------------------------------------------------------------
-- purge_upload_tickets (daily 05:00): row cleanup only, no Storage
-- involvement. Section 7.25's own wording: used tickets, or unused ones
-- more than 24 hours past expires_at.
-- ---------------------------------------------------------------------

create or replace function private.purge_upload_tickets()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.upload_tickets
  where used_at is not null
     or (used_at is null and expires_at < now() - interval '24 hours');
$$;

select cron.schedule('purge_upload_tickets', '0 5 * * *', $$select private.purge_upload_tickets()$$);

-- ---------------------------------------------------------------------
-- purge_incoming's listing half. Reads storage.objects directly -- a
-- SECURITY DEFINER function owned by postgres can, regardless of the Data
-- API's exposed-schema restriction, which governs PostgREST routing, not
-- what a function running inside the database can query. Only lists;
-- never deletes, so storage.protect_delete() never fires here. Scoped to
-- the two transient buckets (incoming, video-incoming), never photos,
-- verification, or video-prompts.
-- ---------------------------------------------------------------------

create or replace function public.list_stale_incoming_objects(p_older_than interval default interval '1 hour', p_limit int default 500)
returns table(bucket_id text, object_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('incoming', 'video-incoming')
    and o.name is not null
    and o.created_at < now() - p_older_than
  order by o.created_at
  limit p_limit;
$$;

revoke all on function public.list_stale_incoming_objects(interval, int) from public, anon, authenticated;
grant execute on function public.list_stale_incoming_objects(interval, int) to service_role;

-- ---------------------------------------------------------------------
-- purge_verification_selfies's two halves: list, then clear. Section
-- 7.25's cell reads as two effects joined by "and" (delete the Storage
-- object, and null selfie_path), not two conditions -- matches section
-- 8.3's "deleted within a day of the decision". Nulling only happens in
-- the calling route, after the Storage delete actually succeeds, the same
-- "Storage first, then record it" order processUploadedImage's own
-- cleanup step already follows.
-- ---------------------------------------------------------------------

create or replace function public.list_stale_verification_selfies(p_older_than interval default interval '1 day', p_limit int default 500)
returns table(verification_id uuid, object_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, regexp_replace(v.selfie_path, '^verification/', '')
  from public.verifications v
  where v.decided_at is not null
    and v.decided_at < now() - p_older_than
    and v.selfie_path is not null
  order by v.decided_at
  limit p_limit;
$$;

revoke all on function public.list_stale_verification_selfies(interval, int) from public, anon, authenticated;
grant execute on function public.list_stale_verification_selfies(interval, int) to service_role;

create or replace function public.clear_verification_selfie_path(p_verification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.verifications set selfie_path = null where id = p_verification_id;
$$;

revoke all on function public.clear_verification_selfie_path(uuid) from public, anon, authenticated;
grant execute on function public.clear_verification_selfie_path(uuid) to service_role;
