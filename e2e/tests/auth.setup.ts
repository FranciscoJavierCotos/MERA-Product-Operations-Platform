/**
 * Playwright global auth setup.
 *
 * Saves authenticated browser state (cookies + localStorage) for each test
 * role so individual tests can skip the login flow and load straight into the
 * protected app.
 *
 * State files (gitignored):
 *   e2e/.auth/admin.json
 *   e2e/.auth/support.json
 *   e2e/.auth/client.json
 *
 * This setup file runs once before the `chromium` project (see playwright.config.ts).
 */

import { test as setup } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, "../.auth");

const TEST_USERS = {
  admin: {
    email: "admin@test.mera.local",
    password: "Test1234!",
    file: path.join(AUTH_DIR, "admin.json"),
  },
  support: {
    email: "support@test.mera.local",
    password: "Test1234!",
    file: path.join(AUTH_DIR, "support.json"),
  },
  client: {
    email: "client@test.mera.local",
    password: "Test1234!",
    file: path.join(AUTH_DIR, "client.json"),
  },
} as const;

async function saveAuth(
  role: keyof typeof TEST_USERS,
  browser: Parameters<typeof setup["use"]>[0],
): Promise<void> {
  const { email, password, file } = TEST_USERS[role];

  // Launch a fresh context to avoid polluting other sessions
  const { chromium } = await import("@playwright/test");
  const ctx = await chromium.launch();
  const page = await ctx.newPage({ baseURL: "http://localhost:3000" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until we land on the dashboard — confirms auth cookie is set
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  await page.context().storageState({ path: file });
  await ctx.close();
}

setup("save admin auth state", async () => {
  await saveAuth("admin", {});
});

setup("save support auth state", async () => {
  await saveAuth("support", {});
});

setup("save client auth state", async () => {
  await saveAuth("client", {});
});
