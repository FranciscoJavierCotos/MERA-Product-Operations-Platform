-- ============================================================
-- Migration 024: Remove stale trigger functions referencing tags
-- Fixes runtime errors like:
--   record "new" has no field "tags"
-- that occur after tickets.tags was removed in migration 022.
--
-- Strategy:
-- - Find non-internal triggers on public.tickets/public.ticket_comments
--   whose trigger function body references NEW.tags or OLD.tags.
-- - Drop those triggers.
-- - Drop orphaned functions when no remaining trigger references them.
--
-- This is intentionally narrow so only stale pre-normalization logic is
-- removed, without touching healthy trigger chains.
-- ============================================================

DO $$
DECLARE
  stale_trigger RECORD;
  function_still_used BOOLEAN;
BEGIN
  FOR stale_trigger IN
    SELECT
      tg.oid AS trigger_oid,
      tg.tgname AS trigger_name,
      cls.relname AS table_name,
      proc.oid AS function_oid,
      proc.proname AS function_name
    FROM pg_trigger tg
    JOIN pg_class cls ON cls.oid = tg.tgrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_proc proc ON proc.oid = tg.tgfoid
    JOIN pg_namespace proc_ns ON proc_ns.oid = proc.pronamespace
    WHERE tg.tgisinternal = false
      AND ns.nspname = 'public'
      AND proc_ns.nspname = 'public'
      AND cls.relname IN ('tickets', 'ticket_comments')
      AND (
        pg_get_functiondef(proc.oid) ILIKE '%NEW.tags%'
        OR pg_get_functiondef(proc.oid) ILIKE '%OLD.tags%'
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      stale_trigger.trigger_name,
      stale_trigger.table_name
    );

    SELECT EXISTS (
      SELECT 1
      FROM pg_trigger t
      WHERE t.tgfoid = stale_trigger.function_oid
        AND t.tgisinternal = false
    )
    INTO function_still_used;

    IF NOT function_still_used THEN
      EXECUTE format(
        'DROP FUNCTION IF EXISTS public.%I()',
        stale_trigger.function_name
      );
    END IF;
  END LOOP;
END;
$$;
