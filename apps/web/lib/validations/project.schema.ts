import { z } from "zod";

export const PROJECT_KEY_REGEX = /^[A-Z][A-Z0-9]{1,9}$/;

export const projectSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      PROJECT_KEY_REGEX,
      "Key must be 2–10 chars, start with a letter, uppercase letters/digits only",
    ),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(2000).optional().nullable(),
  methodology: z.enum(["scrum", "kanban", "waterfall"]).default("scrum"),
  sprint_duration_weeks: z.number().int().min(1).max(4).default(2),
  team_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  methodology: z.enum(["scrum", "kanban", "waterfall"]).optional(),
  status: z.enum(["active", "archived"]).optional(),
  sprint_duration_weeks: z.number().int().min(1).max(4).optional(),
  team_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
export type UpdateProjectFormData = z.infer<typeof updateProjectSchema>;
