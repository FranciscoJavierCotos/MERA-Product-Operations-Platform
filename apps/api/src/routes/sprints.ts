import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as sprints from "../services/sprints";

const IdParam = z.object({ id: z.string().uuid() });
const ProjectIdParam = z.object({ projectId: z.string().uuid() });

const CreateBody = z.object({
  name: z.string().min(1),
  goal: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
}).strict();

const UpdateBody = z.object({
  name: z.string().optional(),
  goal: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.string().optional(),
}).strict();

export const sprintRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/projects/:projectId/sprints",
    { schema: { tags: ["sprints"], params: ProjectIdParam } },
    async (req) => sprints.listProjectSprints(req.supabase, req.params.projectId),
  );
  app.get(
    "/projects/:projectId/sprints/active",
    { schema: { tags: ["sprints"], params: ProjectIdParam } },
    async (req) => sprints.getActiveSprint(req.supabase, req.params.projectId),
  );
  app.get(
    "/projects/:projectId/sprints/next",
    { schema: { tags: ["sprints"], params: ProjectIdParam } },
    async (req) => sprints.getNextSprint(req.supabase, req.params.projectId),
  );
  app.get(
    "/sprints/:id",
    { schema: { tags: ["sprints"], params: IdParam } },
    async (req) => sprints.getSprintById(req.supabase, req.params.id),
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  app.post(
    "/projects/:projectId/sprints",
    { schema: { tags: ["sprints"], params: ProjectIdParam, body: CreateBody } },
    async (req) =>
      sprints.createSprint(req.supabase, { project_id: req.params.projectId, ...req.body } as any),
  );

  app.patch(
    "/sprints/:id",
    { schema: { tags: ["sprints"], params: IdParam, body: UpdateBody } },
    async (req) => sprints.updateSprint(req.supabase, req.params.id, req.body as any),
  );

  app.post(
    "/sprints/:id/start",
    { schema: { tags: ["sprints"], params: IdParam } },
    async (req) => sprints.startSprint(req.supabase, req.params.id),
  );

  app.post(
    "/sprints/:id/complete",
    { schema: { tags: ["sprints"], params: IdParam } },
    async (req) => sprints.completeSprint(req.supabase, req.params.id),
  );

  app.delete(
    "/sprints/:id",
    { schema: { tags: ["sprints"], params: IdParam } },
    async (req) => {
      await sprints.deleteSprint(req.supabase, req.params.id);
      return { ok: true };
    },
  );
};
