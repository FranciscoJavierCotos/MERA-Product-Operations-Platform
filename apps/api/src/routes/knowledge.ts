import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as kb from "../services/knowledge";

const IdParam = z.object({ id: z.string().uuid() });

const DocumentFiltersQuery = z.object({
  collection_id: z.string().uuid().optional(),
  archived: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

const ResolutionFiltersQuery = z.object({
  search: z.string().optional(),
  ai_enabled: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
});

const AuditQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

const MatchBody = z.object({
  embedding: z.array(z.number()),
  threshold: z.number().optional(),
  count: z.number().int().min(1).max(50).optional(),
});

export const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/knowledge/collections", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getCollections(req.supabase),
  );
  app.get("/knowledge/tags", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getTags(req.supabase),
  );
  app.get(
    "/knowledge/documents",
    { schema: { tags: ["knowledge"], querystring: DocumentFiltersQuery } },
    async (req) => kb.getDocuments(req.supabase, req.query),
  );
  app.get(
    "/knowledge/documents/:id",
    { schema: { tags: ["knowledge"], params: IdParam } },
    async (req) => kb.getDocumentById(req.supabase, req.params.id),
  );
  app.get(
    "/knowledge/documents/:id/versions",
    { schema: { tags: ["knowledge"], params: IdParam } },
    async (req) => kb.getDocumentVersions(req.supabase, req.params.id),
  );
  app.get(
    "/knowledge/documents/:id/chunks",
    { schema: { tags: ["knowledge"], params: IdParam } },
    async (req) => kb.getDocumentChunks(req.supabase, req.params.id),
  );
  app.get(
    "/knowledge/resolutions",
    { schema: { tags: ["knowledge"], querystring: ResolutionFiltersQuery } },
    async (req) => kb.getResolutionRows(req.supabase, req.query),
  );
  app.get("/knowledge/retrieval-config", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getRetrievalConfig(req.supabase),
  );
  app.get("/knowledge/kpis", { schema: { tags: ["knowledge"] } }, async (req) =>
    kb.getKnowledgeKpis(req.supabase),
  );
  app.get(
    "/knowledge/audit",
    { schema: { tags: ["knowledge"], querystring: AuditQuery } },
    async (req) => kb.getRecentAudit(req.supabase, req.query.limit),
  );
  app.post(
    "/knowledge/match",
    { schema: { tags: ["knowledge"], body: MatchBody } },
    async (req) =>
      kb.matchKnowledge(req.supabase, req.body.embedding, {
        threshold: req.body.threshold,
        count: req.body.count,
      }),
  );
};
