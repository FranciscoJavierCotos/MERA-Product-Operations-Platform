-- Seed data for development

-- Insert a default team
INSERT INTO teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Team', 'Main support team');

-- Note: Users will be created through Supabase Auth
-- After creating users through the auth flow, you can update their profiles:
-- Example profile updates (run after user signup):
-- UPDATE profiles SET role = 'admin', team_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'admin@example.com';
