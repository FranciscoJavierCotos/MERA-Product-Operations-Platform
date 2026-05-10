-- ============================================================
-- Migration 023: Ticket resolution + AI-ready embedding storage
-- Adds a mandatory resolution narrative for tickets transitioning
-- to a final status (resolved/closed), plus the pgvector
-- infrastructure needed to power semantic similarity search over
-- historical resolutions.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ────────────────────────────────────────────────────────────
-- 2. RESOLUTION COLUMNS ON tickets
-- resolution           — HTML output from the Tiptap editor
-- resolution_plain     — HTML-stripped mirror, fed to the embedder
-- resolution_embedding — 768-dim Gemini text-embedding-004 vector
-- ────────────────────────────────────────────────────────────

ALTER TABLE tickets
  ADD COLUMN resolution           TEXT,
  ADD COLUMN resolution_plain     TEXT,
  ADD COLUMN resolution_embedding vector(768);

-- ────────────────────────────────────────────────────────────
-- 3. HELPER: HTML → plain text
-- Good enough for embedding input. Strips tags, decodes the
-- handful of HTML entities Tiptap emits, and collapses whitespace.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION strip_html_to_plain(html TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text TEXT;
BEGIN
  IF html IS NULL THEN
    RETURN NULL;
  END IF;

  v_text := regexp_replace(html, '<[^>]+>', ' ', 'g');
  v_text := replace(v_text, '&nbsp;', ' ');
  v_text := replace(v_text, '&amp;',  '&');
  v_text := replace(v_text, '&lt;',   '<');
  v_text := replace(v_text, '&gt;',   '>');
  v_text := replace(v_text, '&quot;', '"');
  v_text := replace(v_text, '&#39;',  '''');
  v_text := regexp_replace(v_text, '\s+', ' ', 'g');
  v_text := btrim(v_text);

  RETURN NULLIF(v_text, '');
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. ENFORCE: resolution required when entering a final status
-- Source of truth — RLS-style backstop. The UI also validates,
-- but anything that bypasses the UI must still respect this.
-- Looks up is_final from ticket_statuses so additional final
-- statuses (if ever added) are picked up automatically.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_resolution_on_final_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_final BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status_id = NEW.status_id THEN
    RETURN NEW;
  END IF;

  SELECT is_final INTO v_is_final
  FROM ticket_statuses
  WHERE id = NEW.status_id;

  IF v_is_final IS TRUE
     AND (NEW.resolution IS NULL OR length(btrim(strip_html_to_plain(NEW.resolution))) = 0) THEN
    RAISE EXCEPTION
      'Resolution is required before marking a ticket resolved or closed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_enforce_resolution_on_final_status
  BEFORE INSERT OR UPDATE OF status_id, resolution
  ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_resolution_on_final_status();

-- ────────────────────────────────────────────────────────────
-- 5. SYNC: keep resolution_plain mirroring resolution
-- Runs on every insert/update where resolution changed (or on
-- insert with a non-null resolution). Idempotent.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_resolution_plain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.resolution_plain := strip_html_to_plain(NEW.resolution);

  -- Invalidate the embedding when the underlying text changes; the
  -- pg_net hook below will regenerate it asynchronously.
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.resolution_plain, '') IS DISTINCT FROM COALESCE(NEW.resolution_plain, '') THEN
    NEW.resolution_embedding := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_sync_resolution_plain
  BEFORE INSERT OR UPDATE OF resolution
  ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION sync_resolution_plain();

-- ────────────────────────────────────────────────────────────
-- 6. WEBHOOK: trigger embedding generation via Edge Function
-- Calls supabase/functions/embed-resolution after commit when the
-- plain text changed and the embedding is not yet populated.
-- Reads its target URL + service-role key from app.settings GUCs
-- (set in the project: ALTER DATABASE postgres SET app.settings.supabase_url = '...').
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION request_resolution_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.resolution_plain IS NULL OR length(NEW.resolution_plain) = 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.resolution_plain, '') = COALESCE(NEW.resolution_plain, '') THEN
    RETURN NEW;
  END IF;

  -- URL and anon key are public; the edge function uses its own
  -- injected SUPABASE_SERVICE_ROLE_KEY for the actual DB write.
  PERFORM net.http_post(
    url     := 'https://gaxrzcdpitlkjclljmsn.supabase.co/functions/v1/embed-resolution',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheHJ6Y2RwaXRsa2pjbGxqbXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTUwNTMsImV4cCI6MjA3NzUzMTA1M30.Db3E71AyX41mnBdbOHeD2E7zJEEXa-nJQjHb0b1eYHg'
    ),
    body    := jsonb_build_object('ticket_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_request_resolution_embedding
  AFTER INSERT OR UPDATE OF resolution_plain
  ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION request_resolution_embedding();

-- ────────────────────────────────────────────────────────────
-- 7. INDEX: cosine-similarity search over resolution embeddings
-- ivfflat works well into the 100k-row range; switch to hnsw when
-- the corpus grows. lists ~= sqrt(rows) is the rule of thumb;
-- 100 is a fine starting point.
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_tickets_resolution_embedding_ivfflat
  ON tickets
  USING ivfflat (resolution_embedding vector_cosine_ops)
  WITH (lists = 100);

-- ────────────────────────────────────────────────────────────
-- 8. RPC: match_resolutions (semantic search)
-- Returns the most similar resolved/closed tickets for a query
-- embedding. Honors RLS on tickets via SECURITY INVOKER.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_resolutions(
  query_embedding   vector(768),
  match_count       INT DEFAULT 5,
  exclude_ticket_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  ticket_number INT,
  title         TEXT,
  resolution    TEXT,
  similarity    REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    t.id,
    t.ticket_number,
    t.title,
    t.resolution,
    1 - (t.resolution_embedding <=> query_embedding) AS similarity
  FROM tickets t
  JOIN ticket_statuses s ON s.id = t.status_id
  WHERE t.resolution_embedding IS NOT NULL
    AND s.is_final = TRUE
    AND (exclude_ticket_id IS NULL OR t.id <> exclude_ticket_id)
  ORDER BY t.resolution_embedding <=> query_embedding
  LIMIT match_count;
$$;
