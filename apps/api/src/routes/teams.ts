import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as teams from "../services/teams";

const IdParam = z.object({ id: z.string().uuid() });
const TicketIdParam = z.object({ ticketId: z.string().uuid() });
const CategoryQuery = z.object({
  category: z.enum(["functional", "l1_support", "l2_technical", "l3_engineering"]),
});
const LevelQuery = z.object({ level: z.enum(["L1", "L2", "L3"]) });

const TeamBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.enum(["functional", "l1_support", "l2_technical", "l3_engineering"]).nullable().optional(),
}).strict();

const CollaboratorBody = z.object({
  functional_team_id: z.string().uuid().optional(),
  support_team_id: z.string().uuid().optional(),
  support_level: z.enum(["L1", "L2", "L3"]).optional(),
  notes: z.string().optional(),
}).strict();

const CollaboratorIdParam = z.object({
  collaboratorId: z.string().uuid(),
});

const EscalationBody = z.object({
  ticket_id: z.string().uuid(),
  to_team_id: z.string().uuid(),
  to_support_level: z.enum(["L1", "L2", "L3"]),
  reason: z.string().nullable().optional(),
}).strict();

export const teamRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/teams", { schema: { tags: ["teams"] } }, async (req) =>
    teams.getTeams(req.supabase),
  );
  app.get(
    "/teams/by-category",
    { schema: { tags: ["teams"], querystring: CategoryQuery } },
    async (req) => teams.getTeamsByCategory(req.supabase, req.query.category),
  );
  app.get("/teams/functional", { schema: { tags: ["teams"] } }, async (req) =>
    teams.getFunctionalTeams(req.supabase),
  );
  app.get("/teams/l1", { schema: { tags: ["teams"] } }, async (req) =>
    teams.getL1SupportTeam(req.supabase),
  );
  app.get("/teams/support", { schema: { tags: ["teams"] } }, async (req) =>
    teams.getAllSupportTeams(req.supabase),
  );
  app.get(
    "/teams/support/by-level",
    { schema: { tags: ["teams"], querystring: LevelQuery } },
    async (req) => teams.getSupportTeamsByLevel(req.supabase, req.query.level),
  );
  app.get(
    "/teams/:id",
    { schema: { tags: ["teams"], params: IdParam } },
    async (req) => teams.getTeamById(req.supabase, req.params.id),
  );
  app.get(
    "/teams/escalations/:ticketId",
    { schema: { tags: ["teams"], params: TicketIdParam } },
    async (req) => teams.getEscalationHistory(req.supabase, req.params.ticketId),
  );
  app.get(
    "/teams/collaborators/:ticketId",
    { schema: { tags: ["teams"], params: TicketIdParam } },
    async (req) => teams.getTicketCollaborators(req.supabase, req.params.ticketId),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post("/teams", { schema: { tags: ["teams"], body: TeamBody } }, async (req) =>
    teams.createTeam(req.supabase, req.body as any),
  );
  app.patch(
    "/teams/:id",
    { schema: { tags: ["teams"], params: IdParam, body: TeamBody.partial() } },
    async (req) => teams.updateTeam(req.supabase, req.params.id, req.body as any),
  );
  app.delete("/teams/:id", { schema: { tags: ["teams"], params: IdParam } }, async (req) => {
    await teams.deleteTeam(req.supabase, req.params.id);
    return { ok: true };
  });

  app.post(
    "/teams/collaborators/:ticketId",
    { schema: { tags: ["teams"], params: TicketIdParam, body: CollaboratorBody } },
    async (req) =>
      teams.addTicketCollaborator(req.supabase, {
        ticket_id: req.params.ticketId,
        added_by: req.user.id,
        ...req.body,
      } as any),
  );

  app.delete(
    "/teams/collaborators/by-id/:collaboratorId",
    { schema: { tags: ["teams"], params: CollaboratorIdParam } },
    async (req) => {
      await teams.removeTicketCollaborator(req.supabase, req.params.collaboratorId);
      return { ok: true };
    },
  );

  app.post(
    "/teams/escalations",
    { schema: { tags: ["teams"], body: EscalationBody } },
    async (req) => teams.addEscalationHistory(req.supabase, req.body as any),
  );
};
