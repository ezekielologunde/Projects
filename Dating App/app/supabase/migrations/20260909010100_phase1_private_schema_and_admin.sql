-- Phase 1: the `private` schema and admin foundation.
--
-- `private` is never added to this project's exposed-schema list (Supabase's
-- default is `public` and `graphql_public`). That absence, not a GRANT, is
-- the real control -- spec section 6.5. Confirm after every migration that
-- Project Settings -> API -> Exposed schemas still lists only the default.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users (id)
);

alter table public.admins enable row level security;

create table public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit enable row level security;

-- spec section 9.2: normalises heritage values and faith labels so
-- "Yorùbá", "yoruba", and "YORUBA " all compare equal.
create or replace function private.normalize_key(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '\s+', ' ', 'g'))
$$;

-- Identity only. private.is_admin_mfa (below) is what every RLS policy and
-- function actually uses; this exists as a building block, not a boundary
-- on its own.
create or replace function private.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = uid)
$$;

-- auth.jwt() always reflects the CURRENT request's own session, never an
-- arbitrary uid's. This function is only ever meaningful, and only ever
-- called in this codebase, as private.is_admin_mfa(auth.uid()) -- checking
-- whether the current caller is both an admin and has completed a second
-- factor in this session (spec section 9.1). Passing any other uid would
-- check that uid's admin membership against the CALLER's own aal, which is
-- never done anywhere in this design.
create or replace function private.is_admin_mfa(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin(uid)
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
$$;

-- `authenticated` needs USAGE on `private` and EXECUTE on a narrow set of
-- pure, read-only helpers so that RLS policies and plain (non-DEFINER)
-- trigger functions -- both of which run as the querying role, not an
-- elevated one -- can call them directly. This does not reopen the
-- exposure the second review found: PostgREST's exposed-schema config,
-- not this grant, is what refuses a direct POST /rest/v1/rpc/is_admin_mfa
-- call, and that refusal is unaffected by what `authenticated` can invoke
-- in a plain SQL statement. Confirmed with a real signed-in-user smoke
-- test before this comment was written, not assumed. is_admin is
-- deliberately NOT granted: it is only ever called from inside
-- is_admin_mfa's own SECURITY DEFINER body, which already runs with the
-- function owner's privileges by the time it gets there (spec section 6.5).
grant usage on schema private to authenticated;

revoke all on function private.normalize_key(text) from public, anon;
grant execute on function private.normalize_key(text) to authenticated;

revoke all on function private.is_admin(uuid) from public, anon, authenticated;

revoke all on function private.is_admin_mfa(uuid) from public, anon;
grant execute on function private.is_admin_mfa(uuid) to authenticated;

-- RLS: admins and admin_audit are readable only by an aal2-verified admin
-- (spec section 6.3). Nobody, including admins, gets INSERT/UPDATE/DELETE
-- through RLS; admins is seeded only by a follow-up migration once a real
-- user exists, and admin_audit is written only by SECURITY DEFINER functions.

create policy admins_select_admin_only on public.admins
  for select
  using (private.is_admin_mfa(auth.uid()));

create policy admin_audit_select_admin_only on public.admin_audit
  for select
  using (private.is_admin_mfa(auth.uid()));

-- Thin, UX-only convenience RPC (spec section 6.1, 6.5): lets the Next.js
-- server decide whether to render the admin shell at all. The real
-- enforcement is is_admin_mfa() inside every admin-only policy and function,
-- not this return value.
--
-- Must be SECURITY DEFINER, not INVOKER: private.is_admin_mfa is revoked
-- from `authenticated` (that revocation is the actual security boundary),
-- so an invoker-rights caller would get a bare permission error the moment
-- a real signed-in user called this. Only the function owner's elevated
-- privileges can reach into `private` at all.
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin_mfa(auth.uid())
$$;

revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;
