BEGIN;

CREATE OR REPLACE FUNCTION format_task_history_value(
  p_title TEXT,
  p_priority task_priority,
  p_due_date TIMESTAMPTZ
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT concat(
    coalesce(nullif(trim(p_title), ''), 'Untitled task'),
    ' | Priority: ',
    coalesce(p_priority::text, 'none'),
    ' | Due: ',
    coalesce(to_char(p_due_date, 'YYYY-MM-DD HH24:MI"Z"'), 'No due date')
  );
$$;

CREATE OR REPLACE FUNCTION log_task_activity_on_ticket_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_id IS NULL THEN
      RETURN NEW;
    END IF;

    v_new_value := format_task_history_value(NEW.title, NEW.priority, NEW.due_date);

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
    ) VALUES (
      NEW.ticket_id,
      v_user_id,
      'task_added',
      'task',
      NULL,
      v_new_value,
      'tasks',
      NEW.id,
      jsonb_build_object(
        'task_title', NEW.title,
        'task_priority', NEW.priority,
        'task_due_date', NEW.due_date
      ),
      jsonb_build_object(
        'event', 'added',
        'task_title', NEW.title,
        'task_priority', NEW.priority,
        'task_due_date', NEW.due_date,
        'task_status', NEW.status
      )
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.ticket_id IS NULL THEN
      RETURN OLD;
    END IF;

    v_old_value := format_task_history_value(OLD.title, OLD.priority, OLD.due_date);

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
    ) VALUES (
      OLD.ticket_id,
      v_user_id,
      'task_removed',
      'task',
      v_old_value,
      NULL,
      'tasks',
      OLD.id,
      jsonb_build_object(
        'task_title', OLD.title,
        'task_priority', OLD.priority,
        'task_due_date', OLD.due_date
      ),
      jsonb_build_object(
        'event', 'removed',
        'task_title', OLD.title,
        'task_priority', OLD.priority,
        'task_due_date', OLD.due_date,
        'task_status', OLD.status
      )
    );

    RETURN OLD;
  END IF;

  IF OLD.ticket_id IS DISTINCT FROM NEW.ticket_id THEN
    IF OLD.ticket_id IS NOT NULL THEN
      v_old_value := format_task_history_value(OLD.title, OLD.priority, OLD.due_date);

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
      ) VALUES (
        OLD.ticket_id,
        v_user_id,
        'task_removed',
        'task',
        v_old_value,
        NULL,
        'tasks',
        OLD.id,
        jsonb_build_object(
          'task_title', OLD.title,
          'task_priority', OLD.priority,
          'task_due_date', OLD.due_date
        ),
        jsonb_build_object(
          'event', 'removed',
          'task_title', OLD.title,
          'task_priority', OLD.priority,
          'task_due_date', OLD.due_date,
          'task_status', OLD.status
        )
      );
    END IF;

    IF NEW.ticket_id IS NOT NULL THEN
      v_new_value := format_task_history_value(NEW.title, NEW.priority, NEW.due_date);

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
      ) VALUES (
        NEW.ticket_id,
        v_user_id,
        'task_added',
        'task',
        NULL,
        v_new_value,
        'tasks',
        NEW.id,
        jsonb_build_object(
          'task_title', NEW.title,
          'task_priority', NEW.priority,
          'task_due_date', NEW.due_date
        ),
        jsonb_build_object(
          'event', 'added',
          'task_title', NEW.title,
          'task_priority', NEW.priority,
          'task_due_date', NEW.due_date,
          'task_status', NEW.status
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_old_value := format_task_history_value(OLD.title, OLD.priority, OLD.due_date);
  v_new_value := format_task_history_value(NEW.title, NEW.priority, NEW.due_date);

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
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
    ) VALUES (
      NEW.ticket_id,
      v_user_id,
      'task_completed',
      'task',
      v_old_value,
      v_new_value,
      'tasks',
      NEW.id,
      jsonb_build_object(
        'old_task_title', OLD.title,
        'old_task_priority', OLD.priority,
        'old_task_due_date', OLD.due_date,
        'task_title', NEW.title,
        'task_priority', NEW.priority,
        'task_due_date', NEW.due_date
      ),
      jsonb_build_object(
        'event', 'completed',
        'old_status', OLD.status,
        'new_status', NEW.status,
        'task_title', NEW.title,
        'task_priority', NEW.priority,
        'task_due_date', NEW.due_date
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.action_tag IS DISTINCT FROM OLD.action_tag
    OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.status IS DISTINCT FROM OLD.status
  THEN
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
    ) VALUES (
      NEW.ticket_id,
      v_user_id,
      'task_edited',
      'task',
      v_old_value,
      v_new_value,
      'tasks',
      NEW.id,
      jsonb_build_object(
        'old_task_title', OLD.title,
        'old_task_priority', OLD.priority,
        'old_task_due_date', OLD.due_date,
        'task_title', NEW.title,
        'task_priority', NEW.priority,
        'task_due_date', NEW.due_date
      ),
      jsonb_build_object(
        'event', 'edited',
        'old_status', OLD.status,
        'new_status', NEW.status,
        'task_title', NEW.title,
        'task_priority', NEW.priority,
        'task_due_date', NEW.due_date
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_task_activity_on_ticket_history_insert ON public.tasks;
DROP TRIGGER IF EXISTS log_task_activity_on_ticket_history_update ON public.tasks;
DROP TRIGGER IF EXISTS log_task_activity_on_ticket_history_delete ON public.tasks;

CREATE TRIGGER log_task_activity_on_ticket_history_insert
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_activity_on_ticket_history();

CREATE TRIGGER log_task_activity_on_ticket_history_update
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_activity_on_ticket_history();

CREATE TRIGGER log_task_activity_on_ticket_history_delete
AFTER DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_activity_on_ticket_history();

COMMIT;