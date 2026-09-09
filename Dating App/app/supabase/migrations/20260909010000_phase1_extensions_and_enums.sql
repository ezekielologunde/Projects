-- Phase 1: foundation. Expand migration only (spec section 10.2): every
-- object here is additive, nothing is dropped or narrowed.
--
-- Enums needed for Phase 1's tables only. Phase 2/3/4 enums (feed_decision,
-- like_status, connection_status, end_reason, report_reason, report_severity,
-- report_resolution, contact_method) are introduced in their own phases.

create extension if not exists unaccent with schema extensions;

create type public.profile_status as enum (
  'onboarding', 'pending_review', 'active', 'paused', 'restricted', 'banned', 'deleted'
);
create type public.gender as enum ('woman', 'man', 'nonbinary', 'self_described');
create type public.seeking as enum ('women', 'men', 'everyone');
create type public.goal as enum ('marriage', 'life_partner', 'serious_relationship');
create type public.kids as enum ('want', 'dont_want', 'open', 'have_want_more', 'have_done');
create type public.practice as enum ('devout', 'practicing', 'cultural', 'not_practicing');
create type public.politics as enum ('liberal', 'moderate', 'conservative', 'other', 'prefer_not');
create type public.habit as enum ('never', 'sometimes', 'regularly');
create type public.timeline as enum ('ready_now', 'within_year', 'exploring');
create type public.relocate as enum ('yes', 'no', 'maybe');
create type public.income_band as enum ('under_40k', 'b40_80k', 'b80_150k', 'b150_300k', 'over_300k');
create type public.genotype as enum ('AA', 'AS', 'SS', 'AC', 'SC', 'unknown');
create type public.education as enum (
  'high_school', 'some_college', 'bachelors', 'masters', 'doctorate', 'trade', 'other'
);
create type public.heritage_field as enum (
  'background', 'community', 'origin_country', 'origin_region', 'language', 'raised_in'
);
create type public.pref_mode as enum ('nice_to_have', 'important', 'must');
create type public.verification_decision as enum ('approved', 'rejected');
create type public.consent_kind as enum ('terms', 'privacy', 'sensitive_data', 'genotype_data');
create type public.consent_action as enum ('accepted', 'withdrawn');
create type public.upload_kind as enum ('photo', 'selfie');
