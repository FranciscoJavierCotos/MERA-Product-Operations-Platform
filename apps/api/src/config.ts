import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load .env.local first (Next.js-style), then fall back to .env. Existing
// process.env values always win, so the OS env in production stays authoritative.
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  // Optional: only required for admin/cron endpoints that bypass RLS.
  // Most routes use a per-request user-scoped client via JWT forwarding.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
  isDev: parsed.data.NODE_ENV === "development",
};

export type Env = typeof env;
