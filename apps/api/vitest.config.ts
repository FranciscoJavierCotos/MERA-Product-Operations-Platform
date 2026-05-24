import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Both unit (src/unit/) and integration (src/__tests__/) tests share this config.
    // Run only unit: vitest run src/unit
    // Run only integration: vitest run src/__tests__
    include: ["src/unit/**/*.test.ts", "src/__tests__/**/*.test.ts"],
    // Loads .env.test (gitignored) before workers spawn so env vars are inherited.
    // CI sets these via `supabase status -o env >> $GITHUB_ENV` — no secrets in source.
    globalSetup: ["./src/test-helpers/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/test-helpers/**", "src/**/*.test.ts"],
    },
  },
});
