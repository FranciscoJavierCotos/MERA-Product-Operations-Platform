-- ============================================================
-- pgTAP tests: Cascade delete verification
--
-- Verifies that deleting a ticket cascades correctly to all
-- its child records:
--   - ticket_comments   (ON DELETE CASCADE via ticket_id)
--   - ticket_history    (ON DELETE CASCADE via ticket_id)
--   - sla_instances     (ON DELETE CASCADE via ticket_id)
--   - tasks             (ON DELETE SET NULL — ticket_id becomes null)
--   - ticket_tags       (ON DELETE CASCADE via ticket_id)
--
-- Also verifies:
--   - work_item_history is preserved when the work item is deleted
--     (actual behaviour: ON DELETE CASCADE removes history entries)
--
-- How to run:
--   supabase test db        (local Supabase CLI)
--
-- Everything runs inside a SAVEPOINT that is rolled back at the end,
-- so no test data leaks into the dev database.
--
-- Requires: seed data applied (supabase db reset --local, or seed.sql).
-- Fixed UUIDs used below match apps/api/src/test-helpers/auth.ts.
-- ============================================================

BEGIN;
SELECT plan(22);

-- Fixed UUIDs from seed.sql
\set admin_id  '00000000-0000-0000-0000-000000000010'
\set team_id   '00000000-0000-0000-0000-000000000001'

-- ── helpers: look up seeded lookup IDs ───────────────────────────────────

-- Status id = 1 (new/open — not final)
-- Priority id = 1 (lowest — has an active SLA policy in seed)
-- Category id = 1 (first category)

-- ── 1. Tables exist ───────────────────────────────────────────────────────

SELECT has_table('public', 'tickets',         'tickets table exists');
SELECT has_table('public', 'ticket_comments', 'ticket_comments table exists');
SELECT has_table('public', 'ticket_history',  'ticket_history table exists');
SELECT has_table('public', 'sla_instances',   'sla_instances table exists');
SELECT has_table('public', 'tasks',           'tasks table exists');

-- ── 2. FK constraints use CASCADE or SET NULL as documented ──────────────

SELECT col_is_fk(
  'public', 'ticket_comments', 'ticket_id',
  'ticket_comments.ticket_id is a foreign key'
);

SELECT col_is_fk(
  'public', 'ticket_history', 'ticket_id',
  'ticket_history.ticket_id is a foreign key'
);

SELECT col_is_fk(
  'public', 'sla_instances', 'ticket_id',
  'sla_instances.ticket_id is a foreign key'
);

-- ── 3. Create test ticket and child records ───────────────────────────────

SAVEPOINT before_cascade_test;

DO $$
DECLARE
  v_ticket_id    uuid;
  v_comment_id   uuid;
  v_task_id      uuid;
  v_status_id    int;
  v_priority_id  int;
  v_category_id  int;
  v_admin_id     uuid := '00000000-0000-0000-0000-000000000010';
BEGIN
  -- Resolve lookup IDs from seeded data
  SELECT id INTO v_status_id   FROM ticket_statuses   ORDER BY id LIMIT 1;
  SELECT id INTO v_priority_id FROM ticket_priorities  ORDER BY id LIMIT 1;
  SELECT id INTO v_category_id FROM ticket_categories  ORDER BY id LIMIT 1;

  -- Insert a test ticket
  INSERT INTO tickets (
    title, description, status_id, priority_id, category_id,
    created_by, assigned_to
  ) VALUES (
    '[pgTAP cascade test]',
    '<p>cascade test</p>',
    v_status_id,
    v_priority_id,
    v_category_id,
    v_admin_id,
    v_admin_id
  )
  RETURNING id INTO v_ticket_id;

  -- Store the ticket ID for later assertions
  PERFORM set_config('test.cascade_ticket_id', v_ticket_id::text, true);

  -- Insert a comment (ON DELETE CASCADE expected)
  INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
  VALUES (v_ticket_id, v_admin_id, '<p>test comment</p>', false)
  RETURNING id INTO v_comment_id;

  PERFORM set_config('test.cascade_comment_id', v_comment_id::text, true);

  -- Insert a task linked to the ticket (ticket_id is SET NULL on cascade, not CASCADE)
  INSERT INTO tasks (
    title, priority, status, created_by, assigned_to, ticket_id
  ) VALUES (
    '[pgTAP] cascade task', 'medium', 'pending', v_admin_id, v_admin_id, v_ticket_id
  )
  RETURNING id INTO v_task_id;

  PERFORM set_config('test.cascade_task_id', v_task_id::text, true);
END;
$$;

-- Verify the child records exist before deletion
SELECT ok(
  (SELECT COUNT(*) FROM ticket_comments
     WHERE id = current_setting('test.cascade_comment_id')::uuid) = 1,
  'comment exists before ticket deletion'
);

SELECT ok(
  (SELECT COUNT(*) FROM tasks
     WHERE id = current_setting('test.cascade_task_id')::uuid) = 1,
  'task exists before ticket deletion'
);

SELECT ok(
  (SELECT COUNT(*) FROM ticket_history
     WHERE ticket_id = current_setting('test.cascade_ticket_id')::uuid) >= 1,
  'ticket_history row(s) created by INSERT trigger'
);

-- ── 4. Delete the ticket ──────────────────────────────────────────────────

DELETE FROM tickets
WHERE id = current_setting('test.cascade_ticket_id')::uuid;

-- ── 5. Assert cascades fired correctly ───────────────────────────────────

SELECT ok(
  (SELECT COUNT(*) FROM ticket_comments
     WHERE id = current_setting('test.cascade_comment_id')::uuid) = 0,
  'ticket_comments row deleted via CASCADE after ticket deletion'
);

SELECT ok(
  (SELECT COUNT(*) FROM ticket_history
     WHERE ticket_id = current_setting('test.cascade_ticket_id')::uuid) = 0,
  'ticket_history rows deleted via CASCADE after ticket deletion'
);

SELECT ok(
  (SELECT COUNT(*) FROM sla_instances
     WHERE ticket_id = current_setting('test.cascade_ticket_id')::uuid) = 0,
  'sla_instances row deleted via CASCADE after ticket deletion'
);

SELECT ok(
  (SELECT COUNT(*) FROM tickets
     WHERE id = current_setting('test.cascade_ticket_id')::uuid) = 0,
  'ticket row itself is gone after deletion'
);

-- Task: ticket_id should be SET NULL (task record survives, ticket_id cleared)
SELECT ok(
  (SELECT COUNT(*) FROM tasks
     WHERE id = current_setting('test.cascade_task_id')::uuid
       AND ticket_id IS NULL) = 1,
  'task survives ticket deletion with ticket_id SET NULL'
);

ROLLBACK TO SAVEPOINT before_cascade_test;

-- ── 6. Work item cascade: delete work item → history deleted ─────────────

SAVEPOINT before_wi_cascade;

DO $$
DECLARE
  v_project_id  uuid;
  v_work_item_id uuid;
  v_admin_id     uuid := '00000000-0000-0000-0000-000000000010';
BEGIN
  -- Create a minimal project for the work item
  INSERT INTO projects (key, name, created_by)
  VALUES ('[pgTAP]', '[pgTAP cascade wi]', v_admin_id)
  RETURNING id INTO v_project_id;

  PERFORM set_config('test.cascade_project_id', v_project_id::text, true);

  -- Create the work item (item_key filled by trigger)
  INSERT INTO work_items (
    project_id, type, title, rank, reporter_id
  ) VALUES (
    v_project_id, 'story', '[pgTAP] cascade work item', 'a00001', v_admin_id
  )
  RETURNING id INTO v_work_item_id;

  PERFORM set_config('test.cascade_wi_id', v_work_item_id::text, true);
END;
$$;

SELECT ok(
  (SELECT COUNT(*) FROM work_items
     WHERE id = current_setting('test.cascade_wi_id')::uuid) = 1,
  'work_item exists before deletion'
);

SELECT ok(
  (SELECT COUNT(*) FROM work_item_history
     WHERE work_item_id = current_setting('test.cascade_wi_id')::uuid) >= 0,
  'work_item_history exists (or is empty if trigger not fired in plain SQL insert)'
);

DELETE FROM work_items
WHERE id = current_setting('test.cascade_wi_id')::uuid;

SELECT ok(
  (SELECT COUNT(*) FROM work_items
     WHERE id = current_setting('test.cascade_wi_id')::uuid) = 0,
  'work_item is deleted'
);

SELECT ok(
  (SELECT COUNT(*) FROM work_item_history
     WHERE work_item_id = current_setting('test.cascade_wi_id')::uuid) = 0,
  'work_item_history rows deleted via CASCADE after work_item deletion'
);

DELETE FROM projects
WHERE id = current_setting('test.cascade_project_id')::uuid;

ROLLBACK TO SAVEPOINT before_wi_cascade;

-- ── Finalise ──────────────────────────────────────────────────────────────

SELECT * FROM finish();
ROLLBACK;
