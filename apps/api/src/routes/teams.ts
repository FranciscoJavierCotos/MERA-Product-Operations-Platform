import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as teams from "../services/teams";

const IdParam = z.object({ id: z.string().uuid() });
const MemberIdParam = z.object({ id: z.string().uuid(), mid: z.string().uuid() });
const TicketIdParam = z.object({ ticketId: z.string().uuid() });
const CollaboratorIdParam = z.object({ collaboratorId: z.string().uuid() });

const LevelQuery = z.object({ level: z.enum(["L1", "L2", "L3"]) });
const TypeQuery = z.object({
  type: z.enum(["business", "support", "engineering"]),
});

const TeamBody = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  team_type: z.enum(["business", "support", "engineering"]).nullable().optional(),
  support_level: z.enum(["L1", "L2", "L3"]).nullable().optional(),
}).strict();

const MemberBody = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["lead", "member"]).default("member"),
}).strict();

const MemberRoleBody = z.object({
  role: z.enum(["lead", "member"]),
}).strict();

const CollaboratorBody = z.object({
  team_id: z.string().uuid(),
  support_level: z.enum(["L1", "L2", "L3"]).optional(),
  notes: z.string().optional(),
}).strict();

const EscalationBody = z.object({
  ticket_id: z.string().uuid(),
  to_team_id: z.string().uuid(),
  to_support_level: z.enum(["L1", "L2", "L3"]),
  reason: z.string().nullable().optional(),
}).strict();

export const teamRoutes: FastifyPluginAsyncZod = async (app) => {
  // ─── Queries ──────────────────────────────────────────────────────────────

  app.get("/teams", { schema: { tags: ["teams"] } }, async (req) =>
    teams.getTeams(req.supabase),
  );

  app.get(
    "/teams/by-type",
    { schema: { tags: ["teams"], querystring: TypeQuery } },
    async (req) => teams.getTeamsByType(req.supabase, req.query.type),
  );

  app.get("/teams/business", { schema: { tags: ["teams"] } }, async (req) =>
    teams.getBusinessTeams(req.supabase),
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
    "/teams/escalations/:ticketId",
    { schema: { tags: ["teams"], params: TicketIdParam } },
    async (req) =>
      teams.getEscalationHistory(req.supabase, req.params.ticketId),
  );

  app.get(
    "/teams/collaborators/:ticketId",
    { schema: { tags: ["teams"], params: TicketIdParam } },
    async (req) =>
      teams.getTicketCollaborators(req.supabase, req.params.ticketId),
  );

  // ── Team detail + members (must come before /teams/:id to avoid param clash) ─

  app.get(
    "/teams/:id/detail",
    { schema: { tags: ["teams"], params: IdParam } },
    async (req) => teams.getTeamDetail(req.supabase, req.params.id),
  );

  app.get(
    "/teams/:id/members",
    { schema: { tags: ["teams"], params: IdParam } },
    async (req) => teams.getTeamMembers(req.supabase, req.params.id),
  );

  app.get(
    "/teams/:id",
    { schema: { tags: ["teams"], params: IdParam } },
    async (req) => teams.getTeamById(req.supabase, req.params.id),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/teams",
    { schema: { tags: ["teams"], body: TeamBody } },
    async (req) => teams.createTeam(req.supabase, req.body as any),
  );

  app.patch(
    "/teams/:id",
    { schema: { tags: ["teams"], params: IdParam, body: TeamBody.partial() } },
    async (req) =>
      teams.updateTeam(req.supabase, req.params.id, req.body as any),
  );

  app.delete(
    "/teams/:id",
    { schema: { tags: ["teams"], params: IdParam } },
    async (req) => {
      await teams.deleteTeam(req.supabase, req.params.id);
      return { ok: true };
    },
  );

  // ── Team member management ─────────────────────────────────────────────────

  app.post(
    "/teams/:id/members",
    { schema: { tags: ["teams"], params: IdParam, body: MemberBody } },
    async (req) =>
      teams.addTeamMember(
        req.supabase,
        req.params.id,
        req.body.user_id,
        req.body.role,
        req.user.id,
      ),
  );

  app.patch(
    "/teams/:id/members/:mid",
    { schema: { tags: ["teams"], params: MemberIdParam, body: MemberRoleBody } },
    async (req) =>
      teams.updateTeamMemberRole(
        req.supabase,
        req.params.mid,
        req.body.role,
      ),
  );

  app.delete(
    "/teams/:id/members/:mid",
    { schema: { tags: ["teams"], params: MemberIdParam } },
    async (req) => {
      await teams.removeTeamMember(req.supabase, req.params.mid);
      return { ok: true };
    },
  );

  // ── Collaborators ──────────────────────────────────────────────────────────

  app.post(
    "/teams/collaborators/:ticketId",
    {
      schema: {
        tags: ["teams"],
        params: TicketIdParam,
        body: CollaboratorBody,
      },
    },
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
      await teams.removeTicketCollaborator(
        req.supabase,
        req.params.collaboratorId,
      );
      return { ok: true };
    },
  );

  // ── Escalations ────────────────────────────────────────────────────────────

  app.post(
    "/teams/escalations",
    { schema: { tags: ["teams"], body: EscalationBody } },
    async (req) => teams.addEscalationHistory(req.supabase, req.body as any),
  );
};
