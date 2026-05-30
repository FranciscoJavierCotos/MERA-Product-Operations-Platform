import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stms/contracts";
import type {
  WorkItem,
  WorkItemWithRelations,
  WorkItemStatus,
  WorkItemHistoryEntry,
  BoardColumn,
  CreateWorkItemInput,
  UpdateWorkItemInput,
} from "../types/work-item.types";
import {
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_LABELS,
} from "../types/work-item.types";

type Client = SupabaseClient<Database>;

const WORK_ITEM_SELECT = `
  id, project_id, sprint_id, item_key, type, status, priority_id,
  title, description, story_points, assigned_to, reporter_id,
  parent_id, rank, created_at, updated_at,
  priority:ticket_priorities(id, name, label, color_class, display_order),
  assignee:profiles!work_items_assigned_to_fkey(id, full_name, email, avatar_url),
  reporter:profiles!work_items_reporter_id_fkey(id, full_name, email, avatar_url)
`;

export async function listBacklog(
  supabase: Client,
  projectId: string,
): Promise<WorkItemWithRelations[]> {
  const { data, error } = await supabase
    .from("work_items")
    .select(WORK_ITEM_SELECT)
    .eq("project_id", projectId)
    .is("sprint_id", null)
    .order("rank", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkItemWithRelations[];
}

/**
 * Returns items grouped by status for the sprint board.
 * If sprintId is null, returns an empty board (no active sprint).
 */
export async function listSprintItems(
  supabase: Client,
  sprintId: string,
): Promise<WorkItemWithRelations[]> {
  const { data, error } = await supabase
    .from("work_items")
    .select(WORK_ITEM_SELECT)
    .eq("sprint_id", sprintId)
    .order("rank", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkItemWithRelations[];
}

export async function listSprintBoard(
  supabase: Client,
  sprintId: string | null,
): Promise<BoardColumn[]> {
  const columns: BoardColumn[] = WORK_ITEM_STATUSES.map((status) => ({
    status,
    label: WORK_ITEM_STATUS_LABELS[status],
    items: [],
  }));

  if (!sprintId) return columns;

  const { data, error } = await supabase
    .from("work_items")
    .select(WORK_ITEM_SELECT)
    .eq("sprint_id", sprintId)
    .order("rank", { ascending: true });

  if (error) throw new Error(error.message);

  for (const item of (data ?? []) as unknown as WorkItemWithRelations[]) {
    const col = columns.find((c) => c.status === item.status);
    if (col) col.items.push(item);
  }
  return columns;
}

export async function getWorkItemByKey(
  supabase: Client,
  itemKey: string,
): Promise<WorkItemWithRelations | null> {
  const { data, error } = await supabase
    .from("work_items")
    .select(WORK_ITEM_SELECT)
    .eq("item_key", itemKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as WorkItemWithRelations) ?? null;
}

export async function getWorkItem(
  supabase: Client,
  id: string,
): Promise<WorkItemWithRelations | null> {
  const { data, error } = await supabase
    .from("work_items")
    .select(WORK_ITEM_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as WorkItemWithRelations) ?? null;
}

export async function createWorkItem(
  supabase: Client,
  input: CreateWorkItemInput & { reporter_id: string },
): Promise<WorkItem> {
  // item_key is left null on insert â€” the BEFORE INSERT trigger fills it
  // via generate_work_item_key(). We cast through any because the generated
  // types still require item_key on Insert (regenerate to fix).
  const payload = {
    project_id: input.project_id,
    sprint_id: input.sprint_id ?? null,
    type: input.type ?? "story",
    title: input.title,
    description: input.description ?? null,
    priority_id: input.priority_id ?? null,
    story_points: input.story_points ?? null,
    assigned_to: input.assigned_to ?? null,
    reporter_id: input.reporter_id,
    parent_id: input.parent_id ?? null,
    rank: input.rank,
  };
  const { data, error } = await (supabase.from("work_items") as any)
    .insert([payload])
    .select(WORK_ITEM_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as WorkItem;
}

export async function updateWorkItem(
  supabase: Client,
  id: string,
  updates: UpdateWorkItemInput,
): Promise<WorkItem> {
  const { data, error } = await (supabase.from("work_items") as any)
    .update(updates)
    .eq("id", id)
    .select(WORK_ITEM_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as WorkItem;
}

export async function moveToSprint(
  supabase: Client,
  id: string,
  sprintId: string | null,
): Promise<WorkItem> {
  return updateWorkItem(supabase, id, { sprint_id: sprintId });
}

export async function updateStatus(
  supabase: Client,
  id: string,
  status: WorkItemStatus,
): Promise<WorkItem> {
  return updateWorkItem(supabase, id, { status });
}

export async function reorderItem(
  supabase: Client,
  id: string,
  rank: string,
  patch: Pick<UpdateWorkItemInput, "status" | "sprint_id"> = {},
): Promise<WorkItem> {
  return updateWorkItem(supabase, id, { rank, ...patch });
}

export async function getWorkItemHistory(
  supabase: Client,
  workItemId: string,
): Promise<WorkItemHistoryEntry[]> {
  const { data, error } = await supabase
    .from("work_item_history")
    .select(
      `
      id, work_item_id, user_id, action, field_name, old_value, new_value,
      metadata, created_at,
      user:profiles(id, full_name, email, avatar_url)
    `,
    )
    .eq("work_item_id", workItemId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as WorkItemHistoryEntry[];
}

/**
 * Find the smallest existing rank for a project (used when inserting at top).
 */
export async function getFirstRank(
  supabase: Client,
  projectId: string,
  sprintId: string | null,
  status?: WorkItemStatus,
): Promise<string | null> {
  let query = supabase
    .from("work_items")
    .select("rank")
    .eq("project_id", projectId)
    .order("rank", { ascending: true })
    .limit(1);

  query =
    sprintId == null
      ? query.is("sprint_id", null)
      : query.eq("sprint_id", sprintId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.[0] as { rank?: string } | undefined)?.rank ?? null;
}

/**
 * Find the largest existing rank for a project/sprint/status (used when appending to bottom).
 */
export async function getLastRank(
  supabase: Client,
  projectId: string,
  sprintId: string | null,
  status?: WorkItemStatus,
): Promise<string | null> {
  let query = supabase
    .from("work_items")
    .select("rank")
    .eq("project_id", projectId)
    .order("rank", { ascending: false })
    .limit(1);

  query =
    sprintId == null
      ? query.is("sprint_id", null)
      : query.eq("sprint_id", sprintId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.[0] as { rank?: string } | undefined)?.rank ?? null;
}
