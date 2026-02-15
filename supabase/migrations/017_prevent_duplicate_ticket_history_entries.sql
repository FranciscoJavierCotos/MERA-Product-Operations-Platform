-- Remove legacy duplicate history trigger and harden history logging against duplicate inserts

BEGIN;

-- Drop any ticket triggers tied to legacy/current history logging functions, then recreate a single canonical trigger
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'tickets'
      AND NOT t.tgisinternal
      AND p.proname IN ('log_ticket_changes', 'log_ticket_history_on_change')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tickets', trigger_record.tgname);
  END LOOP;
END;
$$;

-- Remove legacy function that caused duplicate writes
DROP FUNCTION IF EXISTS public.log_ticket_changes();

-- Remove existing exact duplicates created by double-trigger writes
WITH ranked_history AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY ticket_id, user_id, action, field_name, old_value, new_value, created_at
      ORDER BY id
    ) AS duplicate_rank
  FROM public.ticket_history
)
DELETE FROM public.ticket_history
WHERE id IN (
  SELECT id FROM ranked_history WHERE duplicate_rank > 1
);

CREATE OR REPLACE FUNCTION log_ticket_field_change(
  p_ticket_id UUID,
  p_user_id UUID,
  p_field_name TEXT,
  p_old_value TEXT,
  p_new_value TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ticket_history th
    WHERE th.ticket_id = p_ticket_id
      AND th.action = 'field_updated'
      AND th.field_name = p_field_name
      AND th.old_value IS NOT DISTINCT FROM p_old_value
      AND th.new_value IS NOT DISTINCT FROM p_new_value
      AND th.user_id IS NOT DISTINCT FROM p_user_id
      AND th.source_table = 'tickets'
      AND th.source_id = p_ticket_id
      AND th.created_at >= statement_timestamp() - INTERVAL '1 second'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO ticket_history (
    ticket_id,
    user_id,
    action,
    field_name,
    old_value,
    new_value,
    source_table,
    source_id,
    metadata,
    changes
  )
  VALUES (
    p_ticket_id,
    p_user_id,
    'field_updated',
    p_field_name,
    p_old_value,
    p_new_value,
    'tickets',
    p_ticket_id,
    COALESCE(p_metadata, '{}'::jsonb),
    jsonb_build_object('from', p_old_value, 'to', p_new_value)
  );
END;
$$;

CREATE OR REPLACE FUNCTION log_ticket_history_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID;
  old_assigned_name TEXT;
  new_assigned_name TEXT;
  old_team_name TEXT;
  new_team_name TEXT;
  old_functional_name TEXT;
  new_functional_name TEXT;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM ticket_history th
      WHERE th.ticket_id = NEW.id
        AND th.action = 'ticket_created'
        AND th.field_name = 'ticket'
        AND th.new_value IS NOT DISTINCT FROM NEW.title
        AND th.user_id IS NOT DISTINCT FROM v_user_id
        AND th.source_table = 'tickets'
        AND th.source_id = NEW.id
        AND th.created_at >= statement_timestamp() - INTERVAL '1 second'
    ) THEN
      INSERT INTO ticket_history (
        ticket_id,
        user_id,
        action,
        field_name,
        new_value,
        source_table,
        source_id,
        changes
      )
      VALUES (
        NEW.id,
        v_user_id,
        'ticket_created',
        'ticket',
        NEW.title,
        'tickets',
        NEW.id,
        jsonb_build_object('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority)
      );
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    PERFORM log_ticket_field_change(NEW.id, v_user_id, 'title'::text, OLD.title, NEW.title);
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'description'::text,
      OLD.description,
      NEW.description
    );
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'status'::text,
      OLD.status::text,
      NEW.status::text
    );
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'priority'::text,
      OLD.priority::text,
      NEW.priority::text
    );
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    SELECT full_name INTO old_assigned_name FROM profiles WHERE id = OLD.assigned_to;
    SELECT full_name INTO new_assigned_name FROM profiles WHERE id = NEW.assigned_to;

    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'assigned_to'::text,
      OLD.assigned_to::text,
      NEW.assigned_to::text,
      jsonb_build_object('old_label', old_assigned_name, 'new_label', new_assigned_name)
    );
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    SELECT name INTO old_team_name FROM teams WHERE id = OLD.team_id;
    SELECT name INTO new_team_name FROM teams WHERE id = NEW.team_id;

    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'team_id'::text,
      OLD.team_id::text,
      NEW.team_id::text,
      jsonb_build_object('old_label', old_team_name, 'new_label', new_team_name)
    );
  END IF;

  IF NEW.functional_team_id IS DISTINCT FROM OLD.functional_team_id THEN
    SELECT name INTO old_functional_name FROM teams WHERE id = OLD.functional_team_id;
    SELECT name INTO new_functional_name FROM teams WHERE id = NEW.functional_team_id;

    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'functional_team_id'::text,
      OLD.functional_team_id::text,
      NEW.functional_team_id::text,
      jsonb_build_object('old_label', old_functional_name, 'new_label', new_functional_name)
    );
  END IF;

  IF NEW.support_level IS DISTINCT FROM OLD.support_level THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'support_level'::text,
      OLD.support_level::text,
      NEW.support_level::text
    );
  END IF;

  IF NEW.category IS DISTINCT FROM OLD.category THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'category'::text,
      OLD.category::text,
      NEW.category::text
    );
  END IF;

  IF NEW.cc_email IS DISTINCT FROM OLD.cc_email THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'cc_email'::text,
      OLD.cc_email,
      NEW.cc_email
    );
  END IF;

  IF NEW.client_temperature IS DISTINCT FROM OLD.client_temperature THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'client_temperature'::text,
      OLD.client_temperature::text,
      NEW.client_temperature::text
    );
  END IF;

  IF NEW.time_worked_minutes IS DISTINCT FROM OLD.time_worked_minutes THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'time_worked_minutes'::text,
      OLD.time_worked_minutes::text,
      NEW.time_worked_minutes::text
    );
  END IF;

  IF NEW.tags IS DISTINCT FROM OLD.tags THEN
    PERFORM log_ticket_field_change(
      NEW.id,
      v_user_id,
      'tags'::text,
      to_jsonb(OLD.tags)::text,
      to_jsonb(NEW.tags)::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER log_ticket_history_on_change
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_history_on_change();

COMMIT;
