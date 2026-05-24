-- ============================================================
-- pgTAP tests: prevent_role_self_elevation trigger
--
-- Tests that the BEFORE UPDATE trigger on `profiles` blocks any
-- non-admin authenticated session from changing the `role` column.
--
-- How to run:
--   supabase test db        (local Supabase CLI)
--
-- The entire suite runs inside a transaction that is rolled back at
-- the end, so no test data leaks into the dev database.
--
-- Requires: seed data applied (supabase db reset --local, or seed.sql).
-- Fixed UUIDs used below match apps/api/src/test-helpers/auth.ts.
-- ============================================================

BEGIN;
SELECT plan(7);

-- Fixed UUIDs from seed.sql / auth.ts
\set admin_id   '00000000-0000-0000-0000-000000000010'
\set member_id  '00000000-0000-0000-0000-000000000011'
\set client_id  '00000000-0000-0000-0000-000000000012'

-- ── 1. Trigger function exists ────────────────────────────────────────────

SELECT has_function(
  'public',
  'prevent_role_self_elevation',
  'prevent_role_self_elevation() function exists in public schema'
);

-- ── 2. Trigger is attached to profiles ───────────────────────────────────

SELECT has_trigger(
  'public',
  'profiles',
  'trg_prevent_role_self_elevation',
  'trg_prevent_role_self_elevation trigger is installed on profiles'
);

-- ── 3. Trigger fires BEFORE UPDATE ───────────────────────────────────────

SELECT trigger_is(
  'public',
  'profiles',
  'trg_prevent_role_self_elevation',
  'BEFORE',
  'trg_prevent_role_self_elevation fires BEFORE update'
);

-- ── 4. Service role (NULL auth.uid) can change any role ──────────────────
-- When executed as service_role, auth.uid() returns NULL, and the
-- trigger has an early-exit: IF v_caller_id IS NULL THEN RETURN NEW.
-- We run directly (no SET LOCAL jwt) to stay in service_role context.

UPDATE public.profiles SET role = 'support_lead'
WHERE id = :'member_id';

SELECT is(
  (SELECT role FROM public.profiles WHERE id = :'member_id'),
  'support_lead'::public.user_role,
  'Service role can promote support_member to support_lead'
);

-- Restore
UPDATE public.profiles SET role = 'support_member'
WHERE id = :'member_id';

SELECT is(
  (SELECT role FROM public.profiles WHERE id = :'member_id'),
  'support_member'::public.user_role,
  'Service role can restore support_member role'
);

-- ── 5. Non-admin authenticated session cannot escalate role ──────────────
-- Simulate a support_member session by setting request.jwt.claims so that
-- auth.uid() returns the member UUID. The trigger then looks up their role,
-- finds 'support_member', and raises insufficient_privilege.

SELECT set_config(
  'request.jwt.claims',
  format(
    '{"sub":"%s","role":"authenticated","email":"support@test.mera.local"}',
    :'member_id'
  ),
  true  -- is_local = applies to current transaction only
);

SELECT throws_ok(
  format(
    $sql$UPDATE public.profiles SET role = 'admin' WHERE id = '%s'$sql$,
    :'member_id'
  ),
  '42501',  -- insufficient_privilege SQLSTATE
  NULL,     -- any message (trigger message contains details)
  'Authenticated non-admin cannot escalate their own role via direct UPDATE'
);

-- Reset jwt.claims so remaining service-role ops in this transaction are unaffected
SELECT set_config('request.jwt.claims', '', true);

-- ── 6. Verify the escalation attempt did NOT change the role ─────────────

SELECT is(
  (SELECT role FROM public.profiles WHERE id = :'member_id'),
  'support_member'::public.user_role,
  'Role remains support_member after blocked escalation attempt'
);

SELECT * FROM finish();
ROLLBACK;
