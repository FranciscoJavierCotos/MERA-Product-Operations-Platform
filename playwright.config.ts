/**
 * Playwright configuration for MERA Product Operations E2E tests.
 *
 * Prerequisites:
 *   1. `supabase start` — local Supabase stack running
 *   2. `pnpm dev`        — both apps/web (:3000) and apps/api (:8080) running
 *
 * Test users (seeded in supabase/seed.sql):
 *   admin@test.mera.local   / Test1234!
 *   support@test.mera.local / Test1234!
 *   client@test.mera.local  / Test1234!
 *
 * Run all E2E tests:    pnpm test:e2e
 * Run a single file:    pnpm test:e2e -- e2e/tests/ticket-lifecycle.spec.ts
 * Run headed (debug):   pnpm test:e2e -- --headed
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env["BASE_URL"] ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/tests",
  /* Run tests in parallel at the file level; individual tests within a file run serially */
  fullyParallel: false,
  /* Fail the build on CI if test.only() is accidentally left in */
  forbidOnly: !!process.env["CI"],
  /* Retry once on CI to handle transient flakiness */
  retries: process.env["CI"] ? 1 : 0,
  /* Single worker in CI (no parallel DB writes), up to 2 locally */
  workers: process.env["CI"] ? 1 : 2,
  /* HTML report and console dots */
  reporter: process.env["CI"] ? "dot" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    /* Capture screenshots and video only on failure */
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    /* Viewport that matches the app's responsive breakpoints */
    viewport: { width: 1280, height: 800 },
    /* Suppress browser console errors in test output */
    ignoreHTTPSErrors: false,
    /* Generous timeout for SSR hydration */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  /* Shared auth state written by the global setup helpers */
  projects: [
    {
      name: "setup-support",
      testMatch: "**/auth.setup.ts",
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup-support"],
    },
  ],

  /* Global timeout per test */
  timeout: 60_000,
});
