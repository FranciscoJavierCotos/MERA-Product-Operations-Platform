import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as users from "../services/users";

const IdParam = z.object({ id: z.string().uuid() });

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/users", { schema: { tags: ["users"] } }, async (req) =>
    users.getAllProfiles(req.supabase),
  );
  app.get("/users/support", { schema: { tags: ["users"] } }, async (req) =>
    users.getSupportMembers(req.supabase),
  );
  app.get(
    "/users/:id",
    { schema: { tags: ["users"], params: IdParam } },
    async (req) => users.getProfile(req.supabase, req.params.id),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  const ProfileUpdateBody = z.object({
    full_name: z.string().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.enum(["admin", "support_lead", "support_member", "client"]).optional(),
    team_id: z.string().uuid().nullable().optional(),
  }).passthrough();

  app.patch(
    "/users/:id",
    { schema: { tags: ["users"], params: IdParam, body: ProfileUpdateBody } },
    async (req) => users.updateProfile(req.supabase, req.params.id, req.body as any),
  );
};
