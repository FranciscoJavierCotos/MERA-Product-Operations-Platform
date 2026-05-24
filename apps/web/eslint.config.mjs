import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  // Next.js 16 flat-config bundle: React, react-hooks, jsx-a11y, import,
  // @next/next (recommended + core-web-vitals), TypeScript-ESLint parser, global ignores.
  ...nextCoreWebVitals,

  // Lockdown: no direct Supabase imports outside the auth shims.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message:
                "Do not import @supabase/supabase-js outside lib/supabase/{client,server}.ts. " +
                "Use lib/api-client (server) or lib/api-client-browser (client) instead.",
            },
            {
              name: "@supabase/ssr",
              message:
                "Do not import @supabase/ssr outside lib/supabase/server.ts.",
            },
          ],
        },
      ],
    },
  },

  // Allow the auth shims themselves to import Supabase directly.
  {
    files: [
      "lib/supabase/client.ts",
      "lib/supabase/server.ts",
      "middleware.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // react-hooks v7 introduced these rules as errors; they were not enforced
  // before this migration. Downgrade to warnings so lint passes while the
  // codebase is gradually updated to satisfy them.
  // TODO: fix the underlying patterns and promote back to "error".
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
    },
  },

  // Don't lint the lint config file itself.
  {
    ignores: ["eslint.config.mjs"],
  },
];
