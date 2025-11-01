import { z } from "zod";

export const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigned_to: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  client_email: z.string().email().optional(),
  client_name: z.string().optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).optional(),
  status: z
    .enum(["open", "in_progress", "waiting_response", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  is_internal: z.boolean().optional(),
});

export type TicketFormData = z.infer<typeof ticketSchema>;
export type UpdateTicketFormData = z.infer<typeof updateTicketSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
