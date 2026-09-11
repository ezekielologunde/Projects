-- Phase 1: append-only consent, and the daily rate-limit counters used by
-- several Phase 1 and later functions (spec section 5.2).

create table public.consent_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.consent_kind not null,
  version text not null,
  action public.consent_action not null,
  occurred_at timestamptz not null default now()
);

create index consent_events_profile_kind_idx on public.consent_events (profile_id, kind, occurred_at desc);

alter table public.consent_events enable row level security;

create policy consent_events_select_own on public.consent_events
  for select
  using (profile_id = auth.uid());
-- INSERT only via record_consent() (SECURITY DEFINER); no UPDATE or DELETE
-- for anyone, ever -- this table is append-only by design (spec section
-- 6.3, 8.1).

-- True when the most recent event for (profile_id, kind) is `accepted` at
-- exactly `min_version`. Used by submit_for_review() and by the genotype
-- gate below.
create or replace function private.has_current_consent(pid uuid, k public.consent_kind, min_version text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select ce.action = 'accepted' and ce.version = min_version
      from public.consent_events ce
      where ce.profile_id = pid and ce.kind = k
      order by ce.occurred_at desc
      limit 1
    ),
    false
  )
$$;

-- Called directly by the plain (non-DEFINER) genotype-gate trigger below,
-- which runs as the querying role -- needs the grant for that call itself
-- (spec section 6.5), independent of this function's own SECURITY DEFINER.
revoke all on function private.has_current_consent(uuid, public.consent_kind, text) from public, anon;
grant execute on function private.has_current_consent(uuid, public.consent_kind, text) to authenticated;

-- Extends the Phase 1 genotype gate (profiles migration) to also require a
-- current genotype_data consent, now that consent_events exists. Additive
-- CREATE OR REPLACE, not a behavior removal, matching the expand-migration
-- discipline in spec section 10.2 -- the function's shape and name are
-- unchanged, it now enforces one more thing it always intended to.
create or replace function private.enforce_genotype_gate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.genotype is not null then
    if not new.health_section_enabled then
      raise exception 'genotype_requires_health_section: turn on the health section first';
    end if;
    if not private.has_current_consent(new.profile_id, 'genotype_data', '1') then
      raise exception 'genotype_requires_consent: accept the health data consent first';
    end if;
  end if;
  return new;
end;
$$;

create table public.user_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  feed_served smallint not null default 0,
  waiting_responses smallint not null default 0,
  messages_sent int not null default 0,
  reports_filed smallint not null default 0,
  photo_uploads smallint not null default 0,
  verification_submissions smallint not null default 0,
  primary key (user_id, day)
);

alter table public.user_daily enable row level security;

create policy user_daily_select_own on public.user_daily
  for select
  using (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy: written only by functions and triggers
-- (spec section 5.2).
