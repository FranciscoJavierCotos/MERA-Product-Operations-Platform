-- ============================================================
-- Migration 020: Add support routing fields to tickets
-- Adds functional_team_id, support_level, and client_temperature
-- columns that are used by the ticket creation and escalation flows.
-- ============================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS functional_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_level text CHECK (support_level IN ('L1', 'L2', 'L3')),
  ADD COLUMN IF NOT EXISTS client_temperature text CHECK (client_temperature IN ('hot', 'warm', 'cool'));

CREATE INDEX IF NOT EXISTS idx_tickets_functional_team_id ON tickets (functional_team_id);
CREATE INDEX IF NOT EXISTS idx_tickets_support_level ON tickets (support_level);
