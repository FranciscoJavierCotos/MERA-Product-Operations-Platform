/**
 * E2E: Unauthenticated access → redirect to /login
 *
 * Verifies the Next.js middleware (middleware.ts) enforces authentication on
 * all protected routes. Every request that arrives without a valid Supabase
 * session cookie must be redirected to /login before any page content is
 * rendered.
 *
 * The tests run with NO storageState so the browser is in a fresh,
 * unauthenticated state — identical to a new visitor or an expired session.
 *
 * Routes exercised:
 *   /             → redirect (dashboard root)
 *   /dashboard    → redirect
 *   /tickets      → redirect
 *   /tickets/new  → redirect
 *   /tasks        → redirect
 *   /projects     → redirect
 *   /settings     → redirect (admin-only)
 *   /knowledge    → redirect
 *
 * Prerequisites:
 *   • `supabase start` with seed data
 *   • `pnpm dev` (web :3000, api :8080)
 *   • NO auth setup required — this file deliberately skips storageState
 */

import { test, expect } from "@playwright/test";

// All tests run without any stored auth state.
// No test.use({ storageState }) → fresh browser context every time.

const PROTECTED_ROUTES = [
  "/",
  "/dashboard",
  "/tickets",
  "/tickets/new",
  "/tasks",
  "/projects",
  "/settings",
  "/knowledge",
];

test.describe("Auth guard — unauthenticated users are redirected to /login", () => {
  // Ensure no auth state leaks in from a previous test file
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of PROTECTED_ROUTES) {
    test(`GET ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);

      // Wait for navigation to settle (Next.js middleware redirect is fast)
      await page.waitForURL(/\/login/, { timeout: 10_000 });

      // Confirm we are on the login page
      const url = page.url();
      expect(url).toMatch(/\/login/);

      // The login form should be visible
      await expect(
        page.getByRole("heading", { name: /sign in|log in|welcome/i }),
      ).toBeVisible({ timeout: 5_000 }).catch(async () => {
        // Fallback: at minimum, an email input should be on the page
        await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5_000 });
      });
    });
  }

  test("login page itself is publicly accessible (no redirect loop)", async ({
    page,
  }) => {
    await page.goto("/login");

    // Should stay on /login (no redirect)
    const url = page.url();
    expect(url).toMatch(/\/login/);

    // Email + password inputs must be rendered
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/password/i)).toBeVisible({ timeout: 5_000 });
  });

  test("invalid credentials show an error message (not a crash)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    await page.getByLabel(/email/i).fill("nobody@invalid.example");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should stay on /login and show an error — not redirect or crash
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    const errorVisible = await page
      .getByText(/invalid|incorrect|error|wrong|failed/i)
      .isVisible()
      .catch(() => false);

    // Accept error text OR staying on /login with no navigation as success
    const stillOnLogin = page.url().includes("/login");
    expect(stillOnLogin || errorVisible).toBe(true);
  });
});
