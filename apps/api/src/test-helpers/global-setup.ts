/**
 * Vitest global setup — runs once in the main process before any workers spawn.
 * Child processes (workers) inherit process.env, so vars loaded here are
 * available in every test file without any per-test setup.
 *
 * Priority (highest → lowest):
 *   1. Env vars already set by CI (GitHub Actions exports from `supabase status`)
 *   2. apps/api/.env.test.local  — per-developer overrides (gitignored)
 *   3. apps/api/.env.test        — shared local-dev defaults   (gitignored)
 *
 * Never put actual secret values in source-controlled files.
 * See apps/api/.env.test.example for the required variable list.
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../",
);

export default function globalSetup(): void {
  // Load project-wide defaults first (override: false = don't clobber CI env vars)
  config({ path: path.join(appRoot, ".env.test"), override: false });
  // Per-developer local file can still override the shared defaults
  config({ path: path.join(appRoot, ".env.test.local"), override: true });
}
