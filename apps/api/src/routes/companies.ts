import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import * as companies from "../services/companies";

const IdParam = z.object({ id: z.string().uuid() });
const ContactIdParam = z.object({
  id: z.string().uuid(),
  cid: z.string().uuid(),
});

const CompanyBody = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    health_status_id: z.number().int().optional(),
    health_note: z.string().nullable().optional(),
    account_owner_id: z.string().uuid().nullable().optional(),
  })
  .strict();

const HealthBody = z
  .object({
    health_status_id: z.number().int(),
    health_note: z.string().nullable().optional(),
  })
  .strict();

const ContactBody = z
  .object({
    full_name: z.string().min(1),
    email: z.string().email(),
    title: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    is_primary: z.boolean().optional(),
  })
  .strict();

export const companyRoutes: FastifyPluginAsyncZod = async (app) => {
  // ─── Queries ──────────────────────────────────────────────────────────────

  app.get("/companies", { schema: { tags: ["companies"] } }, async (req) =>
    companies.getCompanies(req.supabase),
  );

  // Detail must come before /companies/:id to keep param routing unambiguous.
  app.get(
    "/companies/:id/detail",
    { schema: { tags: ["companies"], params: IdParam } },
    async (req) => companies.getCompanyDetail(req.supabase, req.params.id),
  );

  app.get(
    "/companies/:id/contacts",
    { schema: { tags: ["companies"], params: IdParam } },
    async (req) => companies.getCompanyContacts(req.supabase, req.params.id),
  );

  app.get(
    "/companies/:id",
    { schema: { tags: ["companies"], params: IdParam } },
    async (req) => companies.getCompanyById(req.supabase, req.params.id),
  );

  // ─── Company mutations (admin — enforced by RLS) ────────────────────────────

  app.post(
    "/companies",
    { schema: { tags: ["companies"], body: CompanyBody } },
    async (req) =>
      companies.createCompany(req.supabase, req.body as any, req.user.id),
  );

  app.patch(
    "/companies/:id",
    {
      schema: {
        tags: ["companies"],
        params: IdParam,
        body: CompanyBody.partial(),
      },
    },
    async (req) =>
      companies.updateCompany(req.supabase, req.params.id, req.body as any),
  );

  app.delete(
    "/companies/:id",
    { schema: { tags: ["companies"], params: IdParam } },
    async (req) => {
      await companies.deleteCompany(req.supabase, req.params.id);
      return { ok: true };
    },
  );

  // ─── Health (support_or_admin — enforced by RLS) ────────────────────────────

  app.patch(
    "/companies/:id/health",
    { schema: { tags: ["companies"], params: IdParam, body: HealthBody } },
    async (req) =>
      companies.updateCompanyHealth(
        req.supabase,
        req.params.id,
        req.body,
        req.user.id,
      ),
  );

  // ─── Contacts (support_or_admin — enforced by RLS) ──────────────────────────

  app.post(
    "/companies/:id/contacts",
    { schema: { tags: ["companies"], params: IdParam, body: ContactBody } },
    async (req) =>
      companies.addContact(req.supabase, req.params.id, req.body as any),
  );

  app.patch(
    "/companies/:id/contacts/:cid",
    {
      schema: {
        tags: ["companies"],
        params: ContactIdParam,
        body: ContactBody.partial(),
      },
    },
    async (req) =>
      companies.updateContact(req.supabase, req.params.cid, req.body as any),
  );

  app.delete(
    "/companies/:id/contacts/:cid",
    { schema: { tags: ["companies"], params: ContactIdParam } },
    async (req) => {
      await companies.removeContact(req.supabase, req.params.cid);
      return { ok: true };
    },
  );
};
