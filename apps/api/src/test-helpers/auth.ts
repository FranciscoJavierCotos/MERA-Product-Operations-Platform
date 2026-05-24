import { createClient } from "@supabase/supabase-js";

/**
 * Credentials for the three pre-seeded test users (created by supabase/seed.sql).
 * These users only exist in the local Supabase stack — never in production.
 */
export const TEST_USERS = {
  admin: {
    email: "admin@test.mera.local",
    password: "Test1234!",
    id: "00000000-0000-0000-0000-000000000010",
  },
  support_member: {
    email: "support@test.mera.local",
    password: "Test1234!",
    id: "00000000-0000-0000-0000-000000000011",
  },
  client: {
    email: "client@test.mera.local",
    password: "Test1234!",
    id: "00000000-0000-0000-0000-000000000012",
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;

/**
 * Signs in a pre-seeded test user and returns their JWT access token.
 * Requires the local Supabase stack to be running.
 */
export async function getTestJwt(role: TestUserRole): Promise<string> {
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const anonKey = process.env["SUPABASE_ANON_KEY"]!;

  const sb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const creds = TEST_USERS[role];
  const { data, error } = await sb.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });

  if (error || !data.session) {
    throw new Error(
      `Failed to sign in test user "${role}" (${creds.email}): ${error?.message ?? "no session returned"}. ` +
        `Ensure \`supabase start\` is running and seed.sql has been applied.`,
    );
  }

  return data.session.access_token;
}

/**
 * Returns an Authorization header object ready for use with Fastify inject().
 */
export async function authHeader(
  role: TestUserRole,
): Promise<{ Authorization: string }> {
  const token = await getTestJwt(role);
  return { Authorization: `Bearer ${token}` };
}
