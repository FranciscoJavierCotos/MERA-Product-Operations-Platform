import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as users from "../services/users";

const IdParam = z.object({ id: z.string().uuid() });

// ─── Update body schemas ──────────────────────────────────────────────────────
//
// Two strict schemas instead of one .passthrough() schema.
// .strict() means Zod (and Fastify's type provider) rejects any unknown key
// with a 400 — the mass-assignment vector is closed at the schema layer.

/** Fields any authenticated user may set on their own profile. */
const PublicProfileUpdateBody = z
  .object({
    full_name: z.string().min(1).max(200).optional(),
    avatar_url: z.string().url().nullable().optional(),
  })
  .strict();

/** Extended fields only an admin may set — on any profile. */
const AdminProfileUpdateBody = PublicProfileUpdateBody.extend({
  role: z.enum(["admin", "support_lead", "support_member", "client"]).optional(),
}).strict();

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  // ─── Queries ────────────────────────────────────────────────────────────────

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

  app.patch(
    "/users/:id",
    {
      // Advertise the widest (admin) schema in Swagger so the docs remain
      // accurate. Runtime checks below enforce who can use which fields.
      schema: { tags: ["users"], params: IdParam, body: AdminProfileUpdateBody },
    },
    async (req, reply) => {
      const callerId = req.user.id;
      const targetId = req.params.id;

      // ── 1. Resolve caller's role ──────────────────────────────────────────
      // req.user comes from Supabase Auth and only carries the user's identity,
      // not their profiles.role. Look it up via the user-scoped Supabase client
      // so RLS still applies to the lookup itself.
      const callerProfile = await users.getProfile(req.supabase, callerId);
      if (!callerProfile) {
        return reply
          .code(403)
          .send({ error: "forbidden", message: "Caller profile not found" });
      }
      const isAdmin = callerProfile.role === "admin";

      // ── 2. Horizontal privilege check ────────────────────────────────────
      // Non-admins may only update their own profile row.
      if (!isAdmin && callerId !== targetId) {
        return reply.code(403).send({
          error: "forbidden",
          message: "You may only update your own profile",
        });
      }

      // ── 3. Field-level check ─────────────────────────────────────────────
      // Non-admins are not allowed to touch role even on their own row.
      if (!isAdmin && "role" in req.body) {
        return reply.code(403).send({
          error: "forbidden",
          message: "Only administrators may change role",
        });
      }

      // ── 4. Belt-and-suspenders re-parse ──────────────────────────────────
      // Fastify already validated req.body against AdminProfileUpdateBody above
      // (step 1 of the pipeline). This second parse against the tighter public
      // schema for non-admin callers guarantees that no admin-only field can
      // sneak through via any future middleware change.
      const parsed = isAdmin
        ? AdminProfileUpdateBody.safeParse(req.body)
        : PublicProfileUpdateBody.safeParse(req.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      return users.updateProfile(req.supabase, targetId, parsed.data);
    },
  );
};
