import { z } from "zod";

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000000, "Comment is too long (max 5MB including images)"),
  time_worked_minutes: z
    .number()
    .min(0, "Time worked cannot be negative")
    .max(1440, "Time worked cannot exceed 24 hours (1440 minutes)")
    .optional()
    .default(0),
  is_internal: z.boolean().default(false),
});

export type CommentFormData = z.infer<typeof commentSchema>;

export const commentUpdateSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000000, "Comment is too long (max 5MB including images)"),
});

export type CommentUpdateData = z.infer<typeof commentUpdateSchema>;
