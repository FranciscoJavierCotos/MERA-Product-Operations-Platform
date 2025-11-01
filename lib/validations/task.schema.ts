import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().optional(),
  ticket_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid(),
  due_date: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  due_date: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
