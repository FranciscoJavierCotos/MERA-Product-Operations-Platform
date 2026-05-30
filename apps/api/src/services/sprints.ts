import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stms/contracts";
import type {
  Sprint,
  SprintWithCounts,
  CreateSprintInput,
  UpdateSprintInput,
} from "../types/sprint.types";

type Client = SupabaseClient<Database>;

const SPRINT_SELECT = `
  id, project_id, name, goal, start_date, end_date, status, created_at, updated_at
`;

export async function listProjectSprints(
  supabase: Client,
  projectId: string,
): Promise<SprintWithCounts[]> {
  const { data: sprints, error } = await supabase
    .from("sprints")
    .select(SPRINT_SELECT)
    .eq("project_id", projectId)
    .order("status", { ascending: true })
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!sprints || sprints.length === 0) return [];

  // Aggregate counts in a single follow-up query.
  const sprintIds = (sprints as unknown as Sprint[]).map((s) => s.id);
  const { data: items, error: itemsErr } = await supabase
    .from("work_items")
    .select("sprint_id, status")
    .in("sprint_id", sprintIds);

  if (itemsErr) throw new Error(itemsErr.message);

  const counts = new Map<string, { total: number; done: number }>();
  for (const row of (items ?? []) as Array<{ sprint_id: string; status: string }>) {
    const c = counts.get(row.sprint_id) ?? { total: 0, done: 0 };
    c.total += 1;
    if (row.status === "done") c.done += 1;
    counts.set(row.sprint_id, c);
  }

  return (sprints as unknown as Sprint[]).map((s) => ({
    ...s,
    total_items: counts.get(s.id)?.total ?? 0,
    done_items: counts.get(s.id)?.done ?? 0,
  }));
}

export async function getActiveSprint(
  supabase: Client,
  projectId: string,
): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from("sprints")
    .select(SPRINT_SELECT)
    .eq("project_id", projectId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as Sprint) ?? null;
}

export async function getSprintById(
  supabase: Client,
  id: string,
): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from("sprints")
    .select(SPRINT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as Sprint) ?? null;
}

export async function createSprint(
  supabase: Client,
  input: CreateSprintInput,
): Promise<Sprint> {
  const { data, error } = await (supabase.from("sprints") as any)
    .insert([
      {
        project_id: input.project_id,
        name: input.name,
        goal: input.goal ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
      },
    ])
    .select(SPRINT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Sprint;
}

export async function updateSprint(
  supabase: Client,
  id: string,
  updates: UpdateSprintInput,
): Promise<Sprint> {
  const { data, error } = await (supabase.from("sprints") as any)
    .update(updates)
    .eq("id", id)
    .select(SPRINT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Sprint;
}

export async function getNextSprint(
  supabase: Client,
  projectId: string,
): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from("sprints")
    .select(SPRINT_SELECT)
    .eq("project_id", projectId)
    .eq("status", "planned")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as Sprint) ?? null;
}

export async function startSprint(supabase: Client, id: string): Promise<Sprint> {
  return updateSprint(supabase, id, { status: "active" });
}

/**
 * Completes a sprint, returning any non-done items back to the backlog
 * (sprint_id = NULL). Two writes â€” first move items, then mark the sprint.
 */
export async function completeSprint(
  supabase: Client,
  id: string,
): Promise<Sprint> {
  const { error: moveErr } = await (supabase.from("work_items") as any)
    .update({ sprint_id: null })
    .eq("sprint_id", id)
    .neq("status", "done");

  if (moveErr) throw new Error(moveErr.message);

  return updateSprint(supabase, id, { status: "completed" });
}

/**
 * Deletes a sprint. Work items that belong to it are moved back to the backlog
 * (sprint_id = NULL) before deletion so they are not orphaned.
 */
export async function deleteSprint(supabase: Client, id: string): Promise<void> {
  // Move all items back to backlog first.
  const { error: moveErr } = await (supabase.from("work_items") as any)
    .update({ sprint_id: null })
    .eq("sprint_id", id);

  if (moveErr) throw new Error(moveErr.message);

  const { error } = await (supabase.from("sprints") as any)
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
