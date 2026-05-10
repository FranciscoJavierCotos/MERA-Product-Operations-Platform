-- ============================================================
-- Migration 022: Normalize ticket lookup columns
-- Converts status, priority, category, support_level,
-- client_temperature, and tags from inline text values to
-- FK references pointing at dedicated lookup tables.
-- Existing tickets are backfilled with the correct IDs.
-- SLA triggers are recreated to use the new column names.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. LOOKUP TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE ticket_statuses (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  badge_variant TEXT     NOT NULL DEFAULT 'secondary',
  is_final      BOOLEAN  NOT NULL DEFAULT false,
  display_order SMALLINT NOT NULL
);

CREATE TABLE ticket_priorities (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

CREATE TABLE ticket_categories (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

CREATE TABLE ticket_support_levels (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  description   TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

CREATE TABLE ticket_temperatures (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  emoji         TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

CREATE TABLE tags (
  id          SERIAL  PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  slug        TEXT    NOT NULL UNIQUE,
  color_class TEXT    NOT NULL DEFAULT 'bg-gray-100 text-gray-800'
);

CREATE TABLE ticket_tags (
  ticket_id UUID    NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- ────────────────────────────────────────────────────────────
-- 2. SEED LOOKUP TABLES
-- IDs match natural sort order so ORDER BY id = natural order.
-- Status IDs: new=1, pending_customer=2, pending_internal=3,
--             escalated=4, resolved=5, closed=6
-- Priority IDs: low=1, medium=2, high=3, urgent=4
-- ────────────────────────────────────────────────────────────

INSERT INTO ticket_statuses (id, name, label, badge_variant, is_final, display_order) VALUES
  (1, 'new',              'New',                  'default',   false, 1),
  (2, 'pending_customer', 'Pending Customer Side', 'secondary', false, 2),
  (3, 'pending_internal', 'Pending Our Side',      'secondary', false, 3),
  (4, 'escalated',        'Escalated',             'secondary', false, 4),
  (5, 'resolved',         'Resolved',              'secondary', true,  5),
  (6, 'closed',           'Closed',                'secondary', true,  6);

INSERT INTO ticket_priorities (id, name, label, color_class, display_order) VALUES
  (1, 'low',    'Low',    'bg-gray-100 text-gray-800 hover:bg-gray-100',       1),
  (2, 'medium', 'Medium', 'bg-blue-100 text-blue-800 hover:bg-blue-100',       2),
  (3, 'high',   'High',   'bg-orange-100 text-orange-800 hover:bg-orange-100', 3),
  (4, 'urgent', 'Urgent', 'bg-red-100 text-red-800 hover:bg-red-100',          4);

INSERT INTO ticket_categories (id, name, label, display_order) VALUES
  (1, 'bug',                   'Bug',                   1),
  (2, 'feature_request',       'Feature Request',       2),
  (3, 'question',              'Question',              3),
  (4, 'configuration_request', 'Configuration Request', 4);

INSERT INTO ticket_support_levels (id, name, label, description, color_class, display_order) VALUES
  (1, 'L1', 'Level 1', 'Support Desk',      'bg-blue-100 text-blue-800',   1),
  (2, 'L2', 'Level 2', 'Technical Support', 'bg-amber-100 text-amber-800', 2),
  (3, 'L3', 'Level 3', 'Engineering',       'bg-red-100 text-red-800',     3);

INSERT INTO ticket_temperatures (id, name, label, emoji, color_class, display_order) VALUES
  (1, 'cool', 'Good', '🟢', 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80', 1),
  (2, 'warm', 'Warm', '🟡', 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80', 2),
  (3, 'hot',  'Hot',  '🔴', 'bg-red-100 text-red-800 hover:bg-red-100',                                        3);

-- ────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE ticket_statuses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_priorities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_support_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_temperatures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_statuses_read_authenticated"
  ON ticket_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_priorities_read_authenticated"
  ON ticket_priorities FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_categories_read_authenticated"
  ON ticket_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_support_levels_read_authenticated"
  ON ticket_support_levels FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_temperatures_read_authenticated"
  ON ticket_temperatures FOR SELECT TO authenticated USING (true);

CREATE POLICY "tags_read_authenticated"
  ON tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_tags_read_authenticated"
  ON ticket_tags FOR SELECT TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────
-- 4. ADD FK COLUMNS TO TICKETS (nullable during backfill)
-- ────────────────────────────────────────────────────────────

ALTER TABLE tickets
  ADD COLUMN status_id        SMALLINT REFERENCES ticket_statuses(id),
  ADD COLUMN priority_id      SMALLINT REFERENCES ticket_priorities(id),
  ADD COLUMN category_id      SMALLINT REFERENCES ticket_categories(id),
  ADD COLUMN support_level_id SMALLINT REFERENCES ticket_support_levels(id),
  ADD COLUMN temperature_id   SMALLINT REFERENCES ticket_temperatures(id);

-- ────────────────────────────────────────────────────────────
-- 5. BACKFILL FK COLUMNS FROM EXISTING STRING VALUES
-- ────────────────────────────────────────────────────────────

UPDATE tickets SET
  status_id        = (SELECT id FROM ticket_statuses       WHERE name = tickets.status::text),
  priority_id      = (SELECT id FROM ticket_priorities     WHERE name = tickets.priority::text),
  category_id      = (SELECT id FROM ticket_categories     WHERE name = tickets.category::text),
  support_level_id = (SELECT id FROM ticket_support_levels WHERE name = tickets.support_level::text),
  temperature_id   = (SELECT id FROM ticket_temperatures   WHERE name = tickets.client_temperature::text);

-- ────────────────────────────────────────────────────────────
-- 6. ENFORCE NOT NULL + DEFAULT ON REQUIRED COLUMNS
-- ────────────────────────────────────────────────────────────

ALTER TABLE tickets
  ALTER COLUMN status_id   SET NOT NULL,
  ALTER COLUMN status_id   SET DEFAULT 1,
  ALTER COLUMN priority_id SET NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 7. MIGRATE TAGS → tags + ticket_tags JUNCTION
-- ────────────────────────────────────────────────────────────

INSERT INTO tags (name, slug)
SELECT DISTINCT
  tag_name,
  lower(regexp_replace(tag_name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM tickets, unnest(tags) AS tag_name
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT (name) DO NOTHING;

INSERT INTO ticket_tags (ticket_id, tag_id)
SELECT DISTINCT t.id, tg.id
FROM   tickets t
JOIN   LATERAL unnest(t.tags) AS tag_name ON true
JOIN   tags tg ON tg.name = tag_name
WHERE  t.tags IS NOT NULL AND array_length(t.tags, 1) > 0
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. DROP OLD COLUMNS (CHECK constraints auto-drop with them)
-- ────────────────────────────────────────────────────────────

ALTER TABLE tickets
  DROP COLUMN status,
  DROP COLUMN priority,
  DROP COLUMN category,
  DROP COLUMN support_level,
  DROP COLUMN client_temperature,
  DROP COLUMN tags;

-- ────────────────────────────────────────────────────────────
-- 9. UPDATE sla_policies: replace priority TEXT with priority_id FK
-- ────────────────────────────────────────────────────────────

ALTER TABLE sla_policies
  ADD COLUMN priority_id SMALLINT REFERENCES ticket_priorities(id);

UPDATE sla_policies SET
  priority_id = (SELECT id FROM ticket_priorities WHERE name = sla_policies.priority::text);

ALTER TABLE sla_policies
  ALTER COLUMN priority_id SET NOT NULL;

ALTER TABLE sla_policies
  ADD CONSTRAINT sla_policies_priority_id_unique UNIQUE (priority_id);

ALTER TABLE sla_policies
  DROP COLUMN priority;

-- ────────────────────────────────────────────────────────────
-- 10. INDEXES ON NEW FK COLUMNS
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_tickets_status_id        ON tickets (status_id);
CREATE INDEX idx_tickets_priority_id      ON tickets (priority_id);
CREATE INDEX idx_tickets_category_id      ON tickets (category_id);
CREATE INDEX idx_tickets_support_level_id ON tickets (support_level_id);
CREATE INDEX idx_tickets_temperature_id   ON tickets (temperature_id);

CREATE INDEX idx_ticket_tags_ticket_id ON ticket_tags (ticket_id);
CREATE INDEX idx_ticket_tags_tag_id    ON ticket_tags (tag_id);

-- ────────────────────────────────────────────────────────────
-- 11. RECREATE SLA TRIGGER FUNCTIONS TO USE NEW COLUMN NAMES
-- Status IDs: new=1, pending_customer=2, pending_internal=3,
--             escalated=4, resolved=5, closed=6
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_sla_on_ticket_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy sla_policies%ROWTYPE;
BEGIN
  SELECT * INTO v_policy
  FROM sla_policies
  WHERE priority_id = NEW.priority_id AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO sla_instances (
      ticket_id,
      policy_id,
      response_due_at,
      resolution_due_at
    ) VALUES (
      NEW.id,
      v_policy.id,
      NEW.created_at + (v_policy.response_time_minutes  || ' minutes')::interval,
      NEW.created_at + (v_policy.resolution_time_minutes || ' minutes')::interval
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION manage_sla_on_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy     sla_policies%ROWTYPE;
  v_instance   sla_instances%ROWTYPE;
  v_pause_mins integer;
  v_now        timestamptz := now();
BEGIN
  -- No-op if neither priority nor status changed
  IF OLD.priority_id = NEW.priority_id AND OLD.status_id = NEW.status_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_instance FROM sla_instances WHERE ticket_id = NEW.id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Case 1: Priority changed → replace SLA instance (reset from now)
  IF OLD.priority_id <> NEW.priority_id THEN
    SELECT * INTO v_policy
    FROM sla_policies
    WHERE priority_id = NEW.priority_id AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      DELETE FROM sla_instances WHERE ticket_id = NEW.id;
      INSERT INTO sla_instances (
        ticket_id,
        policy_id,
        response_due_at,
        resolution_due_at
      ) VALUES (
        NEW.id,
        v_policy.id,
        v_now + (v_policy.response_time_minutes  || ' minutes')::interval,
        v_now + (v_policy.resolution_time_minutes || ' minutes')::interval
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Case 2: Status changed
  -- pending_customer=2, resolved=5, closed=6
  IF OLD.status_id <> NEW.status_id THEN

    IF NEW.status_id = 2 AND v_instance.paused_at IS NULL THEN
      -- Entering pending_customer → pause SLA
      UPDATE sla_instances
      SET paused_at = v_now, updated_at = v_now
      WHERE ticket_id = NEW.id;

    ELSIF OLD.status_id = 2 AND NEW.status_id <> 2
          AND v_instance.paused_at IS NOT NULL THEN
      -- Leaving pending_customer → resume SLA
      v_pause_mins := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_instance.paused_at))::integer / 60);

      IF NEW.status_id IN (5, 6) THEN
        -- Flush pause without extending deadlines (ticket is done)
        UPDATE sla_instances
        SET
          paused_at            = NULL,
          total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
          updated_at           = v_now
        WHERE ticket_id = NEW.id;
      ELSE
        -- Resume: extend deadlines by pause duration
        UPDATE sla_instances
        SET
          paused_at            = NULL,
          total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
          response_due_at      = v_instance.response_due_at + (v_pause_mins || ' minutes')::interval,
          resolution_due_at    = v_instance.resolution_due_at + (v_pause_mins || ' minutes')::interval,
          updated_at           = v_now
        WHERE ticket_id = NEW.id;
      END IF;

    ELSIF NEW.status_id IN (5, 6) AND v_instance.paused_at IS NOT NULL THEN
      -- Ticket resolved/closed while paused (safety net)
      v_pause_mins := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_instance.paused_at))::integer / 60);
      UPDATE sla_instances
      SET
        paused_at            = NULL,
        total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
        updated_at           = v_now
      WHERE ticket_id = NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;
