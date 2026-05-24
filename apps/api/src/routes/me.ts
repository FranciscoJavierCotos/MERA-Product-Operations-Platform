import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const MeResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  profile: z
    .object({
      id: z.string().uuid(),
      full_name: z.string().nullable(),
      role: z.string(),
    })
    .nullable(),
});

export const meRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/me",
    {
      schema: {
        tags: ["auth"],
        summary: "Return the authenticated user and their profile row",
        response: { 200: MeResponse },
      },
    },
    async (req) => {
      const { data: profile } = await req.supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", req.user.id)
        .maybeSingle();

      return {
        id: req.user.id,
        email: req.user.email ?? null,
        profile: profile ?? null,
      };
    },
  );
};
