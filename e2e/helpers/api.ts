/**
 * E2E test helpers — API data setup/teardown.
 *
 * Uses `page.request` to call the Fastify API directly so tests can seed
 * and clean up data without going through the UI.  Requires both the web
 * app (port 3000) and the API (port 8080) to be running, and local Supabase
 * to be started (`supabase start`) with the seed users present.
 *
 * Environment variables (all optional; fall back to local-dev defaults):
 *   SUPABASE_URL          http://localhost:54321
 *   SUPABASE_ANON_KEY     <from supabase status>
 *   API_URL               http://localhost:8080
 */

import type { APIRequestContext } from "@playwright/test";

// ── Environment defaults ───────────────────────────────────────────────────
export const SUPABASE_URL =
  process.env["SUPABASE_URL"] ?? "http://localhost:54321";

export const SUPABASE_ANON_KEY =
  process.env["SUPABASE_ANON_KEY"] ??
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7ACciz-J_jxosPe7sHGVeqQ6KzA4HxsBq60"; // supabase local default

export const API_URL = process.env["API_URL"] ?? "http://localhost:8080";

// ── Test user credentials (seeded in supabase/seed.sql) ───────────────────
export const TEST_USERS = {
  admin: {
    email: "admin@test.mera.local",
    password: "Test1234!",
    id: "00000000-0000-0000-0000-000000000010",
  },
  support: {
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

export type TestRole = keyof typeof TEST_USERS;

// ── Auth ───────────────────────────────────────────────────────────────────

const jwtCache = new Map<string, string>();

/**
 * Signs in a seeded test user via Supabase Auth and returns the access token.
 * Results are cached within the test session so multiple calls are cheap.
 */
export async function getJwt(
  request: APIRequestContext,
  role: TestRole,
): Promise<string> {
  const cached = jwtCache.get(role);
  if (cached) return cached;

  const user = TEST_USERS[role];
  const resp = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      data: { email: user.email, password: user.password },
    },
  );

  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(
      `E2E auth: sign-in failed for "${role}" (${user.email}): ${resp.status()} ${body}`,
    );
  }

  const json = await resp.json();
  const token: string = json.access_token;
  jwtCache.set(role, token);
  return token;
}

/** Returns `Authorization: Bearer <token>` headers for the given role. */
export async function authHeaders(
  request: APIRequestContext,
  role: TestRole,
): Promise<Record<string, string>> {
  const token = await getJwt(request, role);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ── API helpers ────────────────────────────────────────────────────────────

export interface CreatedTicket {
  id: string;
  title: string;
  ticket_number: number;
}

/**
 * Creates a ticket via the API and returns the created object.
 * Caller is responsible for deletion in afterEach.
 */
export async function createTicketViaApi(
  request: APIRequestContext,
  role: TestRole,
  overrides: Record<string, unknown> = {},
): Promise<CreatedTicket> {
  const headers = await authHeaders(request, role);

  // Resolve lookup IDs first
  const statusRes = await request.get(`${API_URL}/lookup/statuses`, { headers });
  const priorityRes = await request.get(`${API_URL}/lookup/priorities`, { headers });
  const categoryRes = await request.get(`${API_URL}/lookup/categories`, { headers });

  type LookupRow = { id: number; is_final?: boolean };
  const statuses: LookupRow[] = await statusRes.json();
  const priorities: LookupRow[] = await priorityRes.json();
  const categories: LookupRow[] = await categoryRes.json();

  const openStatus = statuses.find((s) => !s.is_final) ?? statuses[0];
  const priority = priorities[0];
  const category = categories[0];

  const title =
    (overrides["title"] as string | undefined) ??
    `[e2e-ticket] ${Date.now()}`;

  const resp = await request.post(`${API_URL}/tickets`, {
    headers,
    data: {
      title,
      description: "<p>E2E test ticket</p>",
      status_id: openStatus.id,
      priority_id: priority.id,
      category_id: category.id,
      ...overrides,
    },
  });

  if (!resp.ok()) {
    throw new Error(`createTicketViaApi failed: ${resp.status()} ${await resp.text()}`);
  }
  return resp.json();
}

/**
 * Creates an internal comment on a ticket via the API.
 */
export async function createInternalCommentViaApi(
  request: APIRequestContext,
  role: TestRole,
  ticketId: string,
  content: string,
): Promise<void> {
  const headers = await authHeaders(request, role);
  const resp = await request.post(`${API_URL}/tickets/${ticketId}/comments`, {
    headers,
    data: { content, is_internal: true, time_worked_minutes: 0 },
  });
  if (!resp.ok()) {
    throw new Error(
      `createInternalCommentViaApi failed: ${resp.status()} ${await resp.text()}`,
    );
  }
}

/**
 * Deletes a ticket via the API (admin only).
 * Silently ignores 404 (already cleaned up) and non-fatal errors.
 */
export async function deleteTicketViaApi(
  request: APIRequestContext,
  ticketId: string,
): Promise<void> {
  const headers = await authHeaders(request, "admin");
  await request.delete(`${API_URL}/tickets/${ticketId}`, { headers });
}
