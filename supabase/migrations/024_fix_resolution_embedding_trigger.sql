-- The original trigger fired on UPDATE OF resolution_plain, but resolution_plain
-- is set by a BEFORE trigger (not the app's SET list), so Postgres never fired it.
-- Fix: watch resolution (what the app writes) instead.
DROP TRIGGER IF EXISTS tickets_request_resolution_embedding ON tickets;

CREATE TRIGGER tickets_request_resolution_embedding
  AFTER INSERT OR UPDATE OF resolution
  ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION request_resolution_embedding();
