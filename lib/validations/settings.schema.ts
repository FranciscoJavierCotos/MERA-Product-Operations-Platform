import { z } from "zod";

// ── Teams ─────────────────────────────────────────────────────────────────────

export const teamCategorySchema = z.enum([
  "functional",
  "l1_support",
  "l2_technical",
  "l3_engineering",
]);

export const teamSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(500).optional().nullable(),
  category: teamCategorySchema,
});

export const updateTeamSchema = teamSchema
  .partial()
  .extend({ id: z.string().uuid() });

export type TeamFormData = z.infer<typeof teamSchema>;
export type UpdateTeamData = z.infer<typeof updateTeamSchema>;

// ── Ticket Statuses ───────────────────────────────────────────────────────────

export const badgeVariantSchema = z.enum([
  "default",
  "secondary",
  "destructive",
  "outline",
]);

export const ticketStatusSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80)
    .regex(/^[a-z_]+$/, "Only lowercase letters and underscores"),
  label: z.string().trim().min(1, "Label is required").max(80),
  badge_variant: badgeVariantSchema,
  is_final: z.boolean().default(false),
  display_order: z.coerce.number().int().min(1).max(999),
});

export const updateTicketStatusSchema = ticketStatusSchema
  .partial()
  .extend({ id: z.number().int() });

export type TicketStatusFormData = z.infer<typeof ticketStatusSchema>;
export type UpdateTicketStatusData = z.infer<typeof updateTicketStatusSchema>;

// ── Ticket Priorities ─────────────────────────────────────────────────────────

export const ticketPrioritySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80)
    .regex(/^[a-z_]+$/, "Only lowercase letters and underscores"),
  label: z.string().trim().min(1, "Label is required").max(80),
  color_class: z.string().trim().min(1, "Color class is required").max(200),
  display_order: z.coerce.number().int().min(1).max(999),
});

export const updateTicketPrioritySchema = ticketPrioritySchema
  .partial()
  .extend({ id: z.number().int() });

export type TicketPriorityFormData = z.infer<typeof ticketPrioritySchema>;
export type UpdateTicketPriorityData = z.infer<
  typeof updateTicketPrioritySchema
>;

// ── Ticket Categories ─────────────────────────────────────────────────────────

export const ticketCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80)
    .regex(/^[a-z_]+$/, "Only lowercase letters and underscores"),
  label: z.string().trim().min(1, "Label is required").max(80),
  display_order: z.coerce.number().int().min(1).max(999),
});

export const updateTicketCategorySchema = ticketCategorySchema
  .partial()
  .extend({ id: z.number().int() });

export type TicketCategoryFormData = z.infer<typeof ticketCategorySchema>;
export type UpdateTicketCategoryData = z.infer<
  typeof updateTicketCategorySchema
>;

// ── Tags ──────────────────────────────────────────────────────────────────────

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, digits, and dashes"),
  color_class: z.string().trim().min(1, "Color class is required").max(200),
});

export const updateTagSchema = tagSchema
  .partial()
  .extend({ id: z.number().int() });

export type TagFormData = z.infer<typeof tagSchema>;
export type UpdateTagData = z.infer<typeof updateTagSchema>;

// ── SLA Policies ──────────────────────────────────────────────────────────────

export const slaPolicySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  priority_id: z.coerce.number().int().positive("Priority is required"),
  response_time_minutes: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 minute")
    .max(100000),
  resolution_time_minutes: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 minute")
    .max(100000),
  is_active: z.boolean().default(true),
});

export const updateSlaPolicySchema = slaPolicySchema
  .partial()
  .extend({ id: z.string().uuid() });

export type SlaPolicyFormData = z.infer<typeof slaPolicySchema>;
export type UpdateSlaPolicyData = z.infer<typeof updateSlaPolicySchema>;

// ── Profile (admin update only) ───────────────────────────────────────────────

export const profileAdminUpdateSchema = z.object({
  id: z.string().uuid(),
  role: z
    .enum(["admin", "support_lead", "support_member", "client"])
    .optional(),
  team_id: z.string().uuid().optional().nullable(),
});

export type ProfileAdminUpdateData = z.infer<typeof profileAdminUpdateSchema>;
