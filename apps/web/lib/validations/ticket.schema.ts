import { z } from "zod";

// Status IDs that are considered "final" — must stay in sync with
// supabase/migrations/022_normalize_ticket_lookup_tables.sql.
// Resolution is mandatory whenever status_id is one of these.
export const FINAL_STATUS_IDS = [5, 6] as const;

const isHtmlEmpty = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;

export const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category_id: z.number().int().positive().optional().nullable(),
  priority_id: z.number().int().positive(),
  status_id: z.number().int().positive().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  functional_team_id: z.string().uuid(),
  team_id: z.string().uuid().optional(),
  support_level_id: z.number().int().positive().optional().nullable(),
  client_email: z.string().email().optional(),
  cc_email: z.string().email().optional(),
  client_name: z.string().optional(),
});

export const updateTicketSchema = z
  .object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(10).optional(),
    status_id: z.number().int().positive().optional(),
    category_id: z.number().int().positive().optional().nullable(),
    priority_id: z.number().int().positive().optional(),
    temperature_id: z.number().int().positive().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    functional_team_id: z.string().uuid().optional(),
    team_id: z.string().uuid().optional().nullable(),
    support_level_id: z.number().int().positive().optional().nullable(),
    cc_email: z.string().email().optional().nullable(),
    resolution: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.status_id !== undefined &&
      (FINAL_STATUS_IDS as readonly number[]).includes(value.status_id) &&
      (value.resolution == null || isHtmlEmpty(value.resolution))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolution"],
        message: "Resolution is required before resolving or closing a ticket",
      });
    }
  });

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  is_internal: z.boolean().optional(),
});

export type TicketFormData = z.infer<typeof ticketSchema>;
export type UpdateTicketFormData = z.infer<typeof updateTicketSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
