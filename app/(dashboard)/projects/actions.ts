"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  projectSchema,
  updateProjectSchema,
} from "@/lib/validations/project.schema";
import {
  sprintSchema,
  updateSprintSchema,
} from "@/lib/validations/sprint.schema";
import {
  workItemSchema,
  updateWorkItemSchema,
  workItemCommentSchema,
} from "@/lib/validations/work-item.schema";
import {
  createProject,
  updateProject,
  archiveProject,
  deleteProject,
  getProjectById,
} from "@/lib/supabase/queries/projects";
import { getProfile } from "@/lib/supabase/queries/users";
import {
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  deleteSprint,
} from "@/lib/supabase/queries/sprints";
import {
  createWorkItem,
  updateWorkItem,
  getLastRank,
} from "@/lib/supabase/queries/work-items";
import { createWorkItemComment } from "@/lib/supabase/queries/work-item-comments";
import { rankBetween } from "@/lib/utils/rank";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

// ────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────

export async function createProjectAction(
  input: unknown,
): Promise<ActionResult<{ key: string }>> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const profile = await getProfile(supabase, user.id);
    if (!profile) {
      return {
        ok: false,
        error: "Profile not found. Please contact an administrator.",
      };
    }
    if (profile.role === "client") {
      return {
        ok: false,
        error: "You do not have permission to create projects.",
      };
    }

    const projectInput = { ...parsed.data };

    // Support members must scope new projects to their own team or themselves.
    if (
      profile.role === "support_member" &&
      !projectInput.team_id &&
      !projectInput.lead_id
    ) {
      if (profile.team_id) {
        projectInput.team_id = profile.team_id;
      } else {
        projectInput.lead_id = user.id;
      }
    }

    const project = await createProject(supabase, {
      ...projectInput,
      created_by: user.id,
    });
    revalidatePath("/projects");
    return { ok: true, data: { key: project.key } };
  } catch (err) {
    console.error("[createProjectAction]", err);
    if (
      err instanceof Error &&
      err.message.includes('row-level security policy for table "projects"')
    ) {
      return {
        ok: false,
        error:
          "You are not allowed to create this project with the selected team/lead. Choose your own team or set yourself as project lead.",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const project = await updateProject(supabase, projectId, parsed.data);
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.key}`);
    return { ok: true, data: project };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function archiveProjectAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const project = await getProjectById(supabase, projectId);
    if (!project) return { ok: false, error: "Project not found" };
    await archiveProject(supabase, projectId);
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.key}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    // Only admins may permanently delete a project.
    const profile = await getProfile(supabase, user.id);
    if (!profile || profile.role !== "admin") {
      return { ok: false, error: "Only admins can delete projects." };
    }

    const project = await getProjectById(supabase, projectId);
    if (!project) return { ok: false, error: "Project not found." };

    await deleteProject(supabase, projectId);

    revalidatePath("/projects");
    return { ok: true, data: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete project.",
    };
  }
}

// ────────────────────────────────────────────────
// Sprints
// ────────────────────────────────────────────────

export async function createSprintAction(
  projectKey: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const parsed = sprintSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const sprint = await createSprint(supabase, parsed.data);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: sprint };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateSprintAction(
  projectKey: string,
  sprintId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const parsed = updateSprintSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const sprint = await updateSprint(supabase, sprintId, parsed.data);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: sprint };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteSprintAction(
  projectKey: string,
  sprintId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    await deleteSprint(supabase, sprintId);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/backlog`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function startSprintAction(
  projectKey: string,
  sprintId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    await startSprint(supabase, sprintId);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function completeSprintAction(
  projectKey: string,
  sprintId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    await completeSprint(supabase, sprintId);
    revalidatePath(`/projects/${projectKey}/sprints`);
    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/backlog`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// ────────────────────────────────────────────────
// Work items
// ────────────────────────────────────────────────

export async function createWorkItemAction(
  projectKey: string,
  input: unknown,
): Promise<ActionResult<{ item_key: string }>> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = workItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    // Append to bottom of the target bucket (backlog or sprint).
    const lastRank = await getLastRank(
      supabase,
      parsed.data.project_id,
      parsed.data.sprint_id ?? null,
    );
    const rank = rankBetween(lastRank, null);

    const item = await createWorkItem(supabase, {
      ...parsed.data,
      rank,
      reporter_id: user.id,
    });

    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/backlog`);
    return { ok: true, data: { item_key: item.item_key } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateWorkItemAction(
  projectKey: string,
  workItemId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const parsed = updateWorkItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const item = await updateWorkItem(supabase, workItemId, parsed.data);
    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/backlog`);
    return { ok: true, data: item };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// ────────────────────────────────────────────────
// Comments
// ────────────────────────────────────────────────

export async function createWorkItemCommentAction(
  projectKey: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = workItemCommentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const comment = await createWorkItemComment(supabase, {
      work_item_id: parsed.data.work_item_id,
      user_id: user.id,
      content: parsed.data.content,
    });
    revalidatePath(`/projects/${projectKey}`);
    return { ok: true, data: comment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
