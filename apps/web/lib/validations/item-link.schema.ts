import { z } from "zod";

export const linkTypeIdSchema = z.enum([
  "implements",
  "implemented_by",
  "blocks",
  "blocked_by",
  "depends_on",
  "depended_on_by",
  "duplicates",
  "duplicated_by",
  "caused_by",
  "causes",
  "relates_to",
]);

export const createItemLinkSchema = z
  .object({
    source_ticket_id: z.string().uuid().optional().nullable(),
    source_work_item_id: z.string().uuid().optional().nullable(),
    target_work_item_id: z.string().uuid(),
    link_type: linkTypeIdSchema,
    is_primary: z.boolean().optional().default(false),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (v) =>
      (v.source_ticket_id && !v.source_work_item_id) ||
      (!v.source_ticket_id && v.source_work_item_id),
    {
      message: "Exactly one of source_ticket_id or source_work_item_id must be set",
      path: ["source_ticket_id"],
    },
  )
  .refine(
    (v) =>
      !v.source_work_item_id || v.source_work_item_id !== v.target_work_item_id,
    {
      message: "A work item cannot link to itself",
      path: ["target_work_item_id"],
    },
  );

export type CreateItemLinkFormData = z.infer<typeof createItemLinkSchema>;
