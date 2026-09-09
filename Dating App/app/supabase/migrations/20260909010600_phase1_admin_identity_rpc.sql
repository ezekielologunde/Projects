-- Phase 1: am_i_admin_identity (spec section 6.1). Found necessary while
-- building the admin UI, not anticipated in advance: the client needs to
-- tell "not an admin at all" apart from "an admin who hasn't completed
-- TOTP yet," and am_i_admin() alone (is_admin AND aal2) cannot distinguish
-- the two. Reveals only the caller's own admin status, never anyone
-- else's, and never substitutes for is_admin_mfa anywhere it actually
-- matters.
create or replace function public.am_i_admin_identity()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin(auth.uid())
$$;

revoke all on function public.am_i_admin_identity() from public, anon;
grant execute on function public.am_i_admin_identity() to authenticated;
