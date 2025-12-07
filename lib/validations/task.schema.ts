import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskStatusSchema = z.enum(["pending", "completed"]);
export const taskActionTagSchema = z.enum([
  "meeting",
  "pending_customer",
  "for_review",
  "send_email",
  "follow_up",
  "internal_review",
  "documentation",
  "testing",
  "deployment",
  "other",
]);

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  priority: taskPrioritySchema.default("medium"),
  action_tag: taskActionTagSchema.default("other"),
  ticket_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid("Please select an assignee"),
  due_date: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z.string().optional().nullable(),
  priority: taskPrioritySchema.optional(),
  action_tag: taskActionTagSchema.optional(),
  status: taskStatusSchema.optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional().nullable(),
});

export const completeTaskSchema = z.object({
  time_spent_minutes: z
    .number()
    .min(0, "Time must be positive")
    .max(1440, "Time cannot exceed 24 hours (1440 minutes)")
    .optional(),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
export type CompleteTaskFormData = z.infer<typeof completeTaskSchema>;

// Legacy exports for backward compatibility
export const taskSchema = createTaskSchema;
export type TaskFormData = CreateTaskFormData;
