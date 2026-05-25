import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as projects from "../services/projects";

const IdParam = z.object({ id: z.string().uuid() });
const KeyParam = z.object({ key: z.string().min(1) });

const CreateBody = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  methodology: z.string().optional(),
  sprint_duration_weeks: z.number().int().min(1).max(4).optional(),
  team_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
}).strict();

const UpdateBody = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  methodology: z.string().optional(),
  status: z.string().optional(),
  sprint_duration_weeks: z.number().int().min(1).max(4).optional(),
  team_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
}).strict();

export const projectRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/projects", { schema: { tags: ["projects"] } }, async (req) =>
    projects.listProjects(req.supabase),
  );
  app.get(
    "/projects/active",
    { schema: { tags: ["projects"], summary: "Active projects with sprint/point aggregates" } },
    async (req) => projects.getActiveProjectsForDashboard(req.supabase),
  );
  app.get(
    "/projects/by-key/:key",
    { schema: { tags: ["projects"], params: KeyParam } },
    async (req) => projects.getProjectByKey(req.supabase, req.params.key),
  );
  app.get(
    "/projects/:id",
    { schema: { tags: ["projects"], params: IdParam } },
    async (req) => projects.getProjectById(req.supabase, req.params.id),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/projects",
    { schema: { tags: ["projects"], body: CreateBody } },
    async (req) =>
      projects.createProject(req.supabase, { ...req.body, created_by: req.user.id } as any),
  );

  app.patch(
    "/projects/:id",
    { schema: { tags: ["projects"], params: IdParam, body: UpdateBody } },
    async (req) => projects.updateProject(req.supabase, req.params.id, req.body as any),
  );

  app.post(
    "/projects/:id/archive",
    { schema: { tags: ["projects"], params: IdParam } },
    async (req) => {
      await projects.archiveProject(req.supabase, req.params.id);
      return { ok: true };
    },
  );

  app.delete(
    "/projects/:id",
    { schema: { tags: ["projects"], params: IdParam } },
    async (req) => {
      await projects.deleteProject(req.supabase, req.params.id);
      return { ok: true };
    },
  );
};
