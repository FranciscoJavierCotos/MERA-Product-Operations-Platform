import { z } from "zod";

/**
 * Client-facing support portal submission schema.
 *
 * Separate from the internal `ticket.schema.ts` — external clients never set
 * staff-only fields (team, assignee, status). The numeric `category_id` /
 * `priority_id` come from the portal's <Select> options (see
 * `app/(portal)/support/options.ts`), which map client-friendly labels to the
 * real lookup-table IDs. `status_id` is fixed to 1 ("new") at submit time.
 */
export const clientTicketSchema = z.object({
  client_name: z.string().min(2, "Please enter your name"),
  client_email: z.string().email("Enter a valid email address"),
  company: z.string().optional(),
  category_id: z
    .number({ invalid_type_error: "Choose a request type" })
    .int()
    .positive("Choose a request type"),
  priority_id: z
    .number({ invalid_type_error: "Choose a priority" })
    .int()
    .positive("Choose a priority"),
  title: z
    .string()
    .min(5, "Add a short subject (5+ characters)")
    .max(200, "Keep the subject under 200 characters"),
  description: z
    .string()
    .min(10, "Tell us a bit more (10+ characters)"),
  // Optional CC — allow empty string from the input, validate only if present.
  cc_email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export type ClientTicketInput = z.infer<typeof clientTicketSchema>;
