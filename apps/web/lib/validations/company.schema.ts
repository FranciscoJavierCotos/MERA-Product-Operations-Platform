import { z } from "zod";

// ── Companies (CRM) ─────────────────────────────────────────────────────────

export const companySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(1000).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  account_owner_id: z.string().uuid().optional().nullable(),
});

export const updateCompanySchema = companySchema
  .partial()
  .extend({ id: z.string().uuid() });

export const companyHealthSchema = z.object({
  health_status_id: z.coerce.number().int().min(1),
  health_note: z.string().max(1000).optional().nullable(),
});

export const companyContactSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email required").max(200),
  title: z.string().max(120).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  is_primary: z.boolean().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;
export type UpdateCompanyData = z.infer<typeof updateCompanySchema>;
export type CompanyHealthFormData = z.infer<typeof companyHealthSchema>;
export type CompanyContactFormData = z.infer<typeof companyContactSchema>;
