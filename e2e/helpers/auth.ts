/**
 * E2E auth helpers — Playwright storage-state paths.
 *
 * Auth state files are written by e2e/tests/auth.setup.ts and read here so
 * individual test files can reference them without hard-coding paths.
 */

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, "../.auth");

export const STORAGE_STATE = {
  admin: path.join(AUTH_DIR, "admin.json"),
  support: path.join(AUTH_DIR, "support.json"),
  client: path.join(AUTH_DIR, "client.json"),
} as const;
