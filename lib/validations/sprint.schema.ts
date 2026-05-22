import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .nullable();

export const sprintSchema = z
  .object({
    project_id: z.string().uuid(),
    name: z.string().trim().min(1, "Name is required").max(120),
    goal: z.string().max(1000).optional().nullable(),
    start_date: isoDate,
    end_date: isoDate,
  })
  .superRefine((value, ctx) => {
    if (
      value.start_date &&
      value.end_date &&
      value.end_date < value.start_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be on or after the start date",
      });
    }
  });

export const updateSprintSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    goal: z.string().max(1000).optional().nullable(),
    start_date: isoDate,
    end_date: isoDate,
    status: z.enum(["planned", "active", "completed"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.start_date &&
      value.end_date &&
      value.end_date < value.start_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be on or after the start date",
      });
    }
  });

export type SprintFormData = z.infer<typeof sprintSchema>;
export type UpdateSprintFormData = z.infer<typeof updateSprintSchema>;
