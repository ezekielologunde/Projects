-- Phase 1: profiles and the owner-only tables around them (spec section 5.2).
-- `seeking` lives in profile_sensitive, not profiles, on purpose (section
-- 0.2 finding 8): every other sensitive field was already owner-only, and
-- seeking reveals orientation, so it gets the same treatment rather than
-- being reachable through a raw SELECT on the one table other users can query.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  status public.profile_status not null default 'onboarding',
  paused_at timestamptz,
  focus_now boolean not null default false,
  first_name text check (char_length(first_name) between 1 and 30),
  age smallint,
  gender public.gender,
  gender_label text check (char_length(gender_label) between 1 and 30),
  city_label text check (char_length(city_label) between 1 and 60),
  capacity smallint not null default 1 check (capacity between 1 and 3),
  occupation text check (char_length(occupation) <= 80),
  education public.education,
  height_cm smallint check (height_cm between 120 and 230),
  show_heritage boolean not null default true,
  prompts jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint gender_label_requires_self_described
    check (gender_label is null or gender = 'self_described')
);

alter table public.profiles enable row level security;

create table public.profile_sensitive (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  seeking public.seeking
);

alter table public.profile_sensitive enable row level security;

create table public.profile_private (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null check (birth_date <= current_date - interval '18 years'),
  lat_coarse numeric(6, 2),
  lon_coarse numeric(6, 2),
  age_min smallint not null default 18 check (age_min between 18 and 99),
  age_max smallint not null default 99 check (age_max between 18 and 99),
  max_distance_km smallint not null default 50 check (max_distance_km between 5 and 500),
  review_flags jsonb not null default '{}'::jsonb,
  email_notifications boolean not null default true,
  constraint age_range_valid check (age_min <= age_max)
);

alter table public.profile_private enable row level security;

create table public.profile_answers (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  goal public.goal,
  kids public.kids,
  faith_label text check (char_length(faith_label) <= 40),
  faith_key text,
  faith_practice public.practice,
  politics public.politics,
  smoking public.habit,
  drinking public.habit,
  timeline public.timeline,
  relocate public.relocate,
  income_band public.income_band,
  health_section_enabled boolean not null default false,
  genotype public.genotype
);

alter table public.profile_answers enable row level security;

create table public.profile_heritage (
  profile_id uuid references public.profiles (id) on delete cascade,
  field public.heritage_field not null,
  value text not null check (char_length(value) between 1 and 40),
  value_key text not null,
  primary key (profile_id, field, value_key)
);

alter table public.profile_heritage enable row level security;

create table public.preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  kids_must boolean not null default false,
  kids_accept public.kids[] not null default '{}',
  faith_key_must boolean not null default false,
  faith_key_accept text[] not null default '{}',
  practice_must boolean not null default false,
  practice_accept public.practice[] not null default '{}',
  politics_must boolean not null default false,
  politics_accept public.politics[] not null default '{}',
  smoking_must boolean not null default false,
  smoking_accept public.habit[] not null default '{}',
  drinking_must boolean not null default false,
  drinking_accept public.habit[] not null default '{}',
  genotype_must boolean not null default false,
  genotype_accept public.genotype[] not null default '{}',
  use_heritage boolean not null default false,
  constraint kids_must_needs_accept check (not kids_must or array_length(kids_accept, 1) > 0),
  constraint faith_must_needs_accept check (not faith_key_must or array_length(faith_key_accept, 1) > 0),
  constraint practice_must_needs_accept check (not practice_must or array_length(practice_accept, 1) > 0),
  constraint politics_must_needs_accept check (not politics_must or array_length(politics_accept, 1) > 0),
  constraint smoking_must_needs_accept check (not smoking_must or array_length(smoking_accept, 1) > 0),
  constraint drinking_must_needs_accept check (not drinking_must or array_length(drinking_accept, 1) > 0),
  constraint genotype_must_needs_accept check (not genotype_must or array_length(genotype_accept, 1) > 0)
);

alter table public.preferences enable row level security;

create table public.heritage_preferences (
  profile_id uuid references public.profiles (id) on delete cascade,
  field public.heritage_field not null,
  mode public.pref_mode not null,
  accept_keys text[] not null default '{}' check (array_length(accept_keys, 1) between 1 and 10),
  primary key (profile_id, field)
);

alter table public.heritage_preferences enable row level security;

-- ---------------------------------------------------------------------
-- Immutable-columns guard (spec section 6.3: "status, verified_at, and age
-- cannot be changed by the user"). SECURITY DEFINER functions that
-- legitimately change these (submit_for_review, admin review, the nightly
-- age refresh, the auth-signup hook) set a local, transaction-scoped GUC
-- to step around it; an ordinary client UPDATE under RLS never can.
-- ---------------------------------------------------------------------

create or replace function private.enforce_profile_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.bypass_profile_guard', true), '') = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.verified_at is distinct from old.verified_at
     or new.age is distinct from old.age then
    raise exception 'not_authorized: status, verified_at, and age cannot be changed directly';
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_immutable
  before update on public.profiles
  for each row execute function private.enforce_profile_immutable_columns();

create or replace function private.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_profile_updated_at();

-- Rate limit on profile edits (spec section 9.4: 60 per hour). Implemented
-- as a simple per-row counter reset hourly rather than a separate table,
-- since only the owner can ever trigger this and the cost of a false
-- positive is just "try again shortly."
create table private.profile_edit_counters (
  profile_id uuid primary key,
  window_started_at timestamptz not null default now(),
  edits_in_window int not null default 0
);

-- SECURITY DEFINER, not the default invoker rights: this touches a table
-- in the `private` schema directly (not just calling a narrow, granted
-- helper function), and keeping that table's access mediated entirely by
-- this one specific trigger is better than opening it to `authenticated`
-- with a table-level grant (spec section 6.5).
create or replace function private.rate_limit_profile_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  counter record;
begin
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

create trigger profiles_rate_limit
  before update on public.profiles
  for each row execute function private.rate_limit_profile_edits();

-- ---------------------------------------------------------------------
-- Prompts: exactly 3 items {prompt_id, answer}, answer 1-200 chars, when
-- present at all (nullable during onboarding until this step is reached).
-- Also the social-handle detection scan (spec section 9.5): a hit sets
-- profile_private.review_flags so the profile is held for admin review.
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

  flagged := combined ~* '@[a-z0-9_.]{2,}|instagram|\msnapchat\M|\mwhatsapp\M|\mtelegram\M|\+?[0-9][0-9\-\s]{8,}[0-9]';

  if flagged then
    update public.profile_private
      set review_flags = review_flags || jsonb_build_object('social_handle', true)
      where profile_id = new.id;
  end if;

  return new;
end;
$$;

create trigger profiles_validate_prompts
  before insert or update of prompts on public.profiles
  for each row execute function private.validate_and_scan_prompts();

-- Age sync from profile_private.birth_date (spec section 5.2: "maintained
-- by trigger... and nightly job"). Bypasses the immutable-columns guard
-- since this is the one legitimate non-admin path that sets `age`.
create or replace function private.sync_profile_age()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles
    set age = floor(extract(year from age(current_date, new.birth_date)))::smallint
    where id = new.profile_id;
  return new;
end;
$$;

create trigger profile_private_sync_age
  after insert or update of birth_date on public.profile_private
  for each row execute function private.sync_profile_age();

-- faith_key is normalize_key(faith_label), kept in sync automatically so
-- must-match comparisons never depend on the client remembering to do this.
create or replace function private.sync_faith_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.faith_key := case when new.faith_label is null then null else private.normalize_key(new.faith_label) end;
  return new;
end;
$$;

create trigger profile_answers_sync_faith_key
  before insert or update of faith_label on public.profile_answers
  for each row execute function private.sync_faith_key();

-- genotype requires health_section_enabled plus a current genotype_data
-- consent (spec section 5.2, 8.1). The consent check is added once
-- consent_events exists later in this phase (CREATE OR REPLACE, additive).
create or replace function private.enforce_genotype_gate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.genotype is not null and not new.health_section_enabled then
    raise exception 'genotype_requires_health_section: turn on the health section first';
  end if;
  return new;
end;
$$;

create trigger profile_answers_genotype_gate
  before insert or update on public.profile_answers
  for each row execute function private.enforce_genotype_gate();

-- normalize_key on heritage values, and at most 5 values per field (spec
-- section 5.2).
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
  where profile_id = new.profile_id and field = new.field and value_key <> new.value_key;

  if existing_count >= 5 then
    raise exception 'too_many_heritage_values: at most 5 values per field';
  end if;
  return new;
end;
$$;

create trigger profile_heritage_sync_key
  before insert or update on public.profile_heritage
  for each row execute function private.sync_heritage_value_key();

-- ---------------------------------------------------------------------
-- can_view_profile (spec section 6.2). Deliberately partial in Phase 1:
-- only the self and admin cases are possible, since the active-connection,
-- feed-item, and surfaced-like cases (3-5 in the spec) depend on tables
-- that don't exist until Phase 2. This is correct for what Phase 1 needs
-- (nobody can discover or match with anyone yet), not an oversight --
-- confirmed and documented in the spec (section 14, Phase 1) before this
-- was written. Phase 2 extends this with CREATE OR REPLACE, purely
-- additively; nothing here needs to change shape when it does.
-- ---------------------------------------------------------------------

create or replace function private.can_view_profile(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer = target or private.is_admin_mfa(viewer)
$$;

-- Called directly by the profiles/photos RLS policies below, which run as
-- the querying role -- authenticated needs EXECUTE for that call itself to
-- be permitted, independent of can_view_profile's own SECURITY DEFINER
-- body (spec section 6.5). Schema exposure, not this grant, is still what
-- blocks a direct REST call.
revoke all on function private.can_view_profile(uuid, uuid) from public, anon;
grant execute on function private.can_view_profile(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RLS policies (spec section 6.3)
-- ---------------------------------------------------------------------

create policy profiles_select_viewable on public.profiles
  for select
  using (private.can_view_profile(auth.uid(), id));

create policy profiles_insert_self on public.profiles
  for insert
  with check (id = auth.uid() and status = 'onboarding');

create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profile_sensitive_own on public.profile_sensitive
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy profile_private_own on public.profile_private
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy profile_answers_own on public.profile_answers
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy profile_heritage_own on public.profile_heritage
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy preferences_own on public.preferences
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy heritage_preferences_own on public.heritage_preferences
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- Auth signup hook: creates the minimal draft rows a new user needs to
-- start filling in immediately. profile_private is NOT created here
-- because birth_date is NOT NULL with an 18+ check and isn't known yet;
-- the client inserts it at the age-gate onboarding step instead.
-- ---------------------------------------------------------------------

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.profile_sensitive (profile_id) values (new.id);
  insert into public.profile_answers (profile_id) values (new.id);
  insert into public.preferences (profile_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();
