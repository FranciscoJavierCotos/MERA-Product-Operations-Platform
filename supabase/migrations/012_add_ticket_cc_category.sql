-- Add CC email + Category fields to tickets, and ensure ticket.updated_at reflects related activity

-- 1) Category enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_category') THEN
    CREATE TYPE ticket_category AS ENUM (
      'bug',
      'feature_request',
      'question',
      'configuration_request'
    );
  END IF;
END $$;

-- 2) New columns
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS cc_email TEXT,
  ADD COLUMN IF NOT EXISTS category ticket_category;

COMMENT ON COLUMN tickets.cc_email IS 'CC recipient email address for ticket updates';
COMMENT ON COLUMN tickets.category IS 'Ticket category (Bug, Feature Request, Question, Configuration Request)';

-- 3) Touch ticket.updated_at when related rows change (comments/tasks/collaborators/escalations)
CREATE OR REPLACE FUNCTION touch_ticket_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  new_ticket_id UUID;
  old_ticket_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_ticket_id := NEW.ticket_id;
    IF new_ticket_id IS NOT NULL THEN
      UPDATE tickets SET updated_at = NOW() WHERE id = new_ticket_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_ticket_id := OLD.ticket_id;
    IF old_ticket_id IS NOT NULL THEN
      UPDATE tickets SET updated_at = NOW() WHERE id = old_ticket_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    new_ticket_id := NEW.ticket_id;
    old_ticket_id := OLD.ticket_id;

    IF old_ticket_id IS NOT NULL THEN
      UPDATE tickets SET updated_at = NOW() WHERE id = old_ticket_id;
    END IF;

    IF new_ticket_id IS NOT NULL AND new_ticket_id <> old_ticket_id THEN
      UPDATE tickets SET updated_at = NOW() WHERE id = new_ticket_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers (idempotent)
DROP TRIGGER IF EXISTS touch_ticket_updated_at_on_ticket_comments ON ticket_comments;
CREATE TRIGGER touch_ticket_updated_at_on_ticket_comments
AFTER INSERT OR UPDATE OR DELETE ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION touch_ticket_updated_at();

DROP TRIGGER IF EXISTS touch_ticket_updated_at_on_tasks ON tasks;
CREATE TRIGGER touch_ticket_updated_at_on_tasks
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION touch_ticket_updated_at();

DROP TRIGGER IF EXISTS touch_ticket_updated_at_on_ticket_collaborators ON ticket_collaborators;
CREATE TRIGGER touch_ticket_updated_at_on_ticket_collaborators
AFTER INSERT OR UPDATE OR DELETE ON ticket_collaborators
FOR EACH ROW EXECUTE FUNCTION touch_ticket_updated_at();

DROP TRIGGER IF EXISTS touch_ticket_updated_at_on_escalation_history ON escalation_history;
CREATE TRIGGER touch_ticket_updated_at_on_escalation_history
AFTER INSERT OR UPDATE OR DELETE ON escalation_history
FOR EACH ROW EXECUTE FUNCTION touch_ticket_updated_at();
