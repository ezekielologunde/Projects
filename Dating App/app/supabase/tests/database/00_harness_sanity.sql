-- Phase 0 placeholder. Confirms the pgTAP harness itself works end to end
-- (extension present, pg_prove runs, exit code is meaningful) before Phase 1
-- adds the real negative-authorization tests from spec section 11.1.
begin;
select plan(1);

select ok(1 = 1, 'pgTAP test harness is wired up correctly');

select * from finish();
rollback;
