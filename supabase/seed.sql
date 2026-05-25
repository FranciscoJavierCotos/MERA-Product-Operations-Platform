-- Seed data for development

-- Insert a default team
INSERT INTO teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Team', 'Main support team');

-- Note: Users will be created through Supabase Auth
-- After creating users through the auth flow, you can update their profiles:
-- Example profile updates (run after user signup):
-- UPDATE profiles SET role = 'admin', team_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'admin@example.com';

-- ============================================================
-- TEST USERS  (local dev only — never run against production)
-- Password for all three: Test1234!
-- Fixed UUIDs so integration tests can reference them directly.
-- ============================================================

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id   uuid := '00000000-0000-0000-0000-000000000010';
  member_id  uuid := '00000000-0000-0000-0000-000000000011';
  client_id  uuid := '00000000-0000-0000-0000-000000000012';
  v_team_id  uuid := '00000000-0000-0000-0000-000000000001';
  test_pass  text := crypt('Test1234!', gen_salt('bf', 10));
BEGIN
  -- ── Insert auth.users rows ──────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    confirmation_token, recovery_token,
    email_change_token_new, email_change,
    is_super_admin
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      admin_id, 'authenticated', 'authenticated',
      'admin@test.mera.local', test_pass,
      now(), now(), now(),
      '{"full_name":"Test Admin"}',
      '{"provider":"email","providers":["email"]}',
      '', '', '', '', false
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      member_id, 'authenticated', 'authenticated',
      'support@test.mera.local', test_pass,
      now(), now(), now(),
      '{"full_name":"Test Support"}',
      '{"provider":"email","providers":["email"]}',
      '', '', '', '', false
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      client_id, 'authenticated', 'authenticated',
      'client@test.mera.local', test_pass,
      now(), now(), now(),
      '{"full_name":"Test Client"}',
      '{"provider":"email","providers":["email"]}',
      '', '', '', '', false
    )
  ON CONFLICT (id) DO NOTHING;

  -- ── The on_auth_user_created trigger auto-creates profiles. ─
  -- ── Update roles and team assignment explicitly.            ─
  UPDATE public.profiles SET
    role    = 'admin',
    team_id = v_team_id
  WHERE id = admin_id;

  UPDATE public.profiles SET
    role    = 'support_member',
    team_id = v_team_id
  WHERE id = member_id;

  UPDATE public.profiles SET
    role = 'client'
  WHERE id = client_id;
END;
$$;
