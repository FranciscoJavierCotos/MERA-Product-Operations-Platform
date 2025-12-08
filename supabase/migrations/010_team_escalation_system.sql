-- Migration: Team Escalation System
-- Adds functional teams, support levels, and escalation tracking

-- Team category enum (grouping for teams)
CREATE TYPE team_category AS ENUM (
  'functional',      -- Functional business teams (Finance, Supply Chain, etc.)
  'l1_support',      -- Level 1 - Generalist support desk
  'l2_technical',    -- Level 2 - Technical support teams
  'l3_engineering'   -- Level 3 - Engineering teams
);

-- Support level enum (escalation levels)
CREATE TYPE support_level AS ENUM ('L1', 'L2', 'L3');

-- Add category to teams table
ALTER TABLE teams ADD COLUMN category team_category;

-- Add description examples for reference
COMMENT ON TYPE team_category IS 'Categories: functional (business areas), l1_support (generalists), l2_technical (technical support), l3_engineering (engineering teams)';

-- Add functional team and support level to tickets
ALTER TABLE tickets ADD COLUMN functional_team_id UUID REFERENCES teams(id);
ALTER TABLE tickets ADD COLUMN support_level support_level DEFAULT 'L1';

-- Create index for the new columns
CREATE INDEX idx_tickets_functional_team ON tickets(functional_team_id);
CREATE INDEX idx_tickets_support_level ON tickets(support_level);
CREATE INDEX idx_teams_category ON teams(category);

-- Escalation history table (tracks all team/level changes)
CREATE TABLE escalation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  
  -- What changed
  from_support_level support_level,
  to_support_level support_level,
  from_team_id UUID REFERENCES teams(id),
  to_team_id UUID REFERENCES teams(id),
  from_functional_team_id UUID REFERENCES teams(id),
  to_functional_team_id UUID REFERENCES teams(id),
  
  -- Context
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalation_history_ticket ON escalation_history(ticket_id);
CREATE INDEX idx_escalation_history_created_at ON escalation_history(created_at DESC);

-- Ticket collaborators table (secondary functional departments and support teams)
CREATE TABLE ticket_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Either a functional team or a support team
  functional_team_id UUID REFERENCES teams(id),
  support_team_id UUID REFERENCES teams(id),
  support_level support_level,
  
  -- Who added this collaborator
  added_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure at least one team is specified
  CONSTRAINT collaborator_has_team CHECK (
    functional_team_id IS NOT NULL OR support_team_id IS NOT NULL
  )
);

CREATE INDEX idx_ticket_collaborators_ticket ON ticket_collaborators(ticket_id);
CREATE INDEX idx_ticket_collaborators_functional ON ticket_collaborators(functional_team_id);
CREATE INDEX idx_ticket_collaborators_support ON ticket_collaborators(support_team_id);

-- Enable RLS on new tables
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escalation_history
CREATE POLICY "Support members can view escalation history"
  ON escalation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'support_lead', 'support_member')
    )
  );

CREATE POLICY "Support members can insert escalation history"
  ON escalation_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'support_lead', 'support_member')
    )
  );

-- RLS Policies for ticket_collaborators
CREATE POLICY "Support members can view ticket collaborators"
  ON ticket_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'support_lead', 'support_member')
    )
  );

CREATE POLICY "Support members can manage ticket collaborators"
  ON ticket_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'support_lead', 'support_member')
    )
  );

-- Teams should be readable by all authenticated users
CREATE POLICY "Teams are viewable by authenticated users"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

-- Also allow support members to manage teams (insert, update, delete) if needed
CREATE POLICY "Support members can manage teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'support_lead')
    )
  );


-- Seed the teams table with all team categories

-- Functional Teams (7)
INSERT INTO teams (id, name, description, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Finance', 'GL, AR/AP, Tax, Assets', 'functional'),
  ('00000000-0000-0000-0000-000000000002', 'Supply Chain', 'Purchasing, Warehouse, Inventory', 'functional'),
  ('00000000-0000-0000-0000-000000000003', 'Manufacturing', 'MRP, Scheduling, BOM', 'functional'),
  ('00000000-0000-0000-0000-000000000004', 'HR/Payroll', 'Payroll engine, leave management', 'functional'),
  ('00000000-0000-0000-0000-000000000005', 'CRM/Sales', 'Opportunities, pricing, quotes', 'functional'),
  ('00000000-0000-0000-0000-000000000006', 'Projects', 'Project costing, timesheets', 'functional'),
  ('00000000-0000-0000-0000-000000000007', 'Service/Field Service', 'Work orders, dispatch', 'functional');

-- L1 Support (1)
INSERT INTO teams (id, name, description, category) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Support Desk', 'Level 1 generalist support', 'l1_support');

-- L2 Technical Support (4)
INSERT INTO teams (id, name, description, category) VALUES
  ('00000000-0000-0000-0002-000000000001', 'Application Technical Support', 'Permissions, workflows, configs', 'l2_technical'),
  ('00000000-0000-0000-0002-000000000002', 'Integration Support', 'APIs, EDI, connectors', 'l2_technical'),
  ('00000000-0000-0000-0002-000000000003', 'Data/DBA Support', 'SQL, migrations, data corrections', 'l2_technical'),
  ('00000000-0000-0000-0002-000000000004', 'Infrastructure/DevOps Support', 'Cloud, servers, performance', 'l2_technical');

-- L3 Engineering (6)
INSERT INTO teams (id, name, description, category) VALUES
  ('00000000-0000-0000-0003-000000000001', 'Backend/Core Engineering', 'Business logic bugs', 'l3_engineering'),
  ('00000000-0000-0000-0003-000000000002', 'Frontend/UI Engineering', 'UX/UI defects', 'l3_engineering'),
  ('00000000-0000-0000-0003-000000000003', 'Platform/DevOps Engineering', 'Deployments, scalability', 'l3_engineering'),
  ('00000000-0000-0000-0003-000000000004', 'Integration Engineering', 'API bugs, connector dev', 'l3_engineering'),
  ('00000000-0000-0000-0003-000000000005', 'QA', 'Reproduce/validate bugs', 'l3_engineering'),
  ('00000000-0000-0000-0003-000000000006', 'Security', 'Role/permission issues, vulnerabilities', 'l3_engineering');
