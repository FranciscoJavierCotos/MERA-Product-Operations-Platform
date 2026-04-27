-- ============================================================
-- Migration 019: SLA System
-- Creates sla_policies and sla_instances tables with
-- DB triggers for automatic SLA assignment, pause/resume,
-- and response tracking.
-- ============================================================

-- 1. sla_policies: SLA tier definitions per priority
CREATE TABLE sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  response_time_minutes integer NOT NULL,
  resolution_time_minutes integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (priority)
);

-- Seed default policies (industry-standard SLA tiers)
INSERT INTO sla_policies (name, priority, response_time_minutes, resolution_time_minutes) VALUES
  ('Urgent SLA',  'urgent', 60,   240),
  ('High SLA',    'high',   240,  480),
  ('Medium SLA',  'medium', 480,  1440),
  ('Low SLA',     'low',    1440, 4320);

-- 2. sla_instances: per-ticket SLA state
CREATE TABLE sla_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES sla_policies(id),
  response_due_at timestamptz NOT NULL,
  resolution_due_at timestamptz NOT NULL,
  responded_at timestamptz,
  paused_at timestamptz,
  total_paused_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id)
);

-- 3. Indexes for common query patterns
CREATE INDEX idx_sla_instances_ticket_id ON sla_instances (ticket_id);
CREATE INDEX idx_sla_instances_resolution_due ON sla_instances (resolution_due_at);
CREATE INDEX idx_sla_instances_response_due ON sla_instances (response_due_at);

-- 4. RLS
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sla_policies_read_authenticated"
  ON sla_policies FOR SELECT TO authenticated USING (true);

ALTER TABLE sla_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sla_instances_read_authenticated"
  ON sla_instances FOR SELECT TO authenticated USING (true);

-- Allow triggers (SECURITY DEFINER functions) to write sla_instances
CREATE POLICY "sla_instances_write_service_role"
  ON sla_instances FOR ALL TO service_role USING (true);

-- ============================================================
-- Trigger 1: Assign SLA when ticket is created
-- ============================================================
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
  WHERE priority = NEW.priority::text AND is_active = true
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
      NEW.created_at + (v_policy.response_time_minutes || ' minutes')::interval,
      NEW.created_at + (v_policy.resolution_time_minutes || ' minutes')::interval
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_sla_on_ticket_insert
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION assign_sla_on_ticket_insert();

-- ============================================================
-- Trigger 2: Manage SLA on ticket update
--   - Priority change → replace SLA instance (reset from now)
--   - Status → pending_customer → pause timer
--   - Status ← pending_customer → resume timer (extend deadlines)
--   - Status → resolved/closed → flush any active pause
-- ============================================================
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
  IF OLD.priority = NEW.priority AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_instance FROM sla_instances WHERE ticket_id = NEW.id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Case 1: Priority changed → replace SLA instance (reset from now)
  IF OLD.priority <> NEW.priority THEN
    SELECT * INTO v_policy
    FROM sla_policies
    WHERE priority = NEW.priority::text AND is_active = true
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
        v_now + (v_policy.response_time_minutes || ' minutes')::interval,
        v_now + (v_policy.resolution_time_minutes || ' minutes')::interval
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Case 2: Status changed
  IF OLD.status <> NEW.status THEN

    -- Entering pending_customer → pause SLA (only if not already paused)
    IF NEW.status = 'pending_customer' AND v_instance.paused_at IS NULL THEN
      UPDATE sla_instances
      SET paused_at = v_now, updated_at = v_now
      WHERE ticket_id = NEW.id;

    -- Leaving pending_customer → resume SLA
    ELSIF OLD.status = 'pending_customer' AND NEW.status <> 'pending_customer'
          AND v_instance.paused_at IS NOT NULL THEN

      v_pause_mins := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_instance.paused_at))::integer / 60);

      IF NEW.status IN ('resolved', 'closed') THEN
        -- Flush pause without extending deadlines (ticket is done)
        UPDATE sla_instances
        SET
          paused_at           = NULL,
          total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
          updated_at          = v_now
        WHERE ticket_id = NEW.id;
      ELSE
        -- Resume: extend deadlines by the pause duration
        UPDATE sla_instances
        SET
          paused_at            = NULL,
          total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
          response_due_at      = v_instance.response_due_at + (v_pause_mins || ' minutes')::interval,
          resolution_due_at    = v_instance.resolution_due_at + (v_pause_mins || ' minutes')::interval,
          updated_at           = v_now
        WHERE ticket_id = NEW.id;
      END IF;

    -- Ticket resolved/closed while paused for a non-pending_customer reason (safety net)
    ELSIF NEW.status IN ('resolved', 'closed') AND v_instance.paused_at IS NOT NULL THEN
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

CREATE TRIGGER manage_sla_on_ticket_update
  AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION manage_sla_on_ticket_update();

-- ============================================================
-- Trigger 3: Mark response SLA on first support-agent comment
-- ============================================================
CREATE OR REPLACE FUNCTION mark_sla_response_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commenter_role text;
BEGIN
  -- Skip internal notes
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;

  -- Only support agents count as a "response"
  SELECT role INTO v_commenter_role FROM profiles WHERE id = NEW.user_id;

  IF v_commenter_role IN ('admin', 'support_lead', 'support_member') THEN
    UPDATE sla_instances
    SET responded_at = NEW.created_at, updated_at = now()
    WHERE ticket_id = NEW.ticket_id
      AND responded_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_sla_response_on_comment
  AFTER INSERT ON ticket_comments
  FOR EACH ROW EXECUTE FUNCTION mark_sla_response_on_comment();

-- ============================================================
-- Backfill: assign SLA to all existing open tickets
-- ============================================================
INSERT INTO sla_instances (
  ticket_id,
  policy_id,
  response_due_at,
  resolution_due_at,
  responded_at
)
SELECT
  t.id,
  p.id,
  t.created_at + (p.response_time_minutes  || ' minutes')::interval,
  t.created_at + (p.resolution_time_minutes || ' minutes')::interval,
  (
    SELECT tc.created_at
    FROM ticket_comments tc
    JOIN profiles pr ON pr.id = tc.user_id
    WHERE tc.ticket_id = t.id
      AND tc.is_internal = false
      AND pr.role IN ('admin', 'support_lead', 'support_member')
    ORDER BY tc.created_at ASC
    LIMIT 1
  )
FROM tickets t
JOIN sla_policies p ON p.priority = t.priority AND p.is_active = true
WHERE t.status NOT IN ('resolved', 'closed')
  AND NOT EXISTS (SELECT 1 FROM sla_instances si WHERE si.ticket_id = t.id);

-- Backfill resolved/closed tickets for historical SLA compliance view
INSERT INTO sla_instances (
  ticket_id,
  policy_id,
  response_due_at,
  resolution_due_at,
  responded_at
)
SELECT
  t.id,
  p.id,
  t.created_at + (p.response_time_minutes  || ' minutes')::interval,
  t.created_at + (p.resolution_time_minutes || ' minutes')::interval,
  (
    SELECT tc.created_at
    FROM ticket_comments tc
    JOIN profiles pr ON pr.id = tc.user_id
    WHERE tc.ticket_id = t.id
      AND tc.is_internal = false
      AND pr.role IN ('admin', 'support_lead', 'support_member')
    ORDER BY tc.created_at ASC
    LIMIT 1
  )
FROM tickets t
JOIN sla_policies p ON p.priority = t.priority AND p.is_active = true
WHERE t.status IN ('resolved', 'closed')
  AND NOT EXISTS (SELECT 1 FROM sla_instances si WHERE si.ticket_id = t.id);
