-- Phase 0: enable pgTAP so the database test harness (spec section 11.1,
-- 11.4) has something to run against before Phase 1 adds real schema.
-- Expand migration: purely additive, no application table touched.
create extension if not exists pgtap with schema extensions;
