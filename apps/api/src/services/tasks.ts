import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@stms/contracts";
import {
  Task,
  TaskStatus,
  TaskActionTag,
  TaskFilters,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStats,
} from "../types/task.types";

type Client = SupabaseClient<Database>;

// Fixed IDs matching the task_statuses and task_action_tags seed data.
const TASK_STATUS_IDS: Record<TaskStatus, number> = {
  pending: 1,
  completed: 2,
};

const TASK_ACTION_TAG_IDS: Record<TaskActionTag, number> = {
  meeting: 1,
  pending_customer: 2,
  for_review: 3,
  send_email: 4,
  follow_up: 5,
  internal_review: 6,
  documentation: 7,
  testing: 8,
  deployment: 9,
  other: 10,
};

const TASK_SELECT = `
  id, title, description, status_id, priority, action_tag_id,
  ticket_id, assigned_to, created_by, due_date, completed_at,
  time_spent_minutes, created_at, updated_at,
  task_status:task_statuses(id, name, label),
  task_action_tag:task_action_tags(id, name, label),
  ticket:tickets(id, ticket_number, title, status_id),
  assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url),
  creator:profiles!tasks_created_by_fkey(id, full_name, email, avatar_url)
`;

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  status_id: number;
  priority: string;
  action_tag_id: number;
  ticket_id: string | null;
  assigned_to: string;
  created_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  time_spent_minutes: number | null;
  created_at: string;
  updated_at: string;
  task_status: { id: number; name: string; label: string } | { id: number; name: string; label: string }[] | null;
  task_action_tag: { id: number; name: string; label: string } | { id: number; name: string; label: string }[] | null;
  ticket: unknown;
  assigned_user: unknown;
  creator: unknown;
};

function normalizeTask(raw: RawTask): Task {
  const statusRow = Array.isArray(raw.task_status) ? raw.task_status[0] : raw.task_status;
  const actionTagRow = Array.isArray(raw.task_action_tag) ? raw.task_action_tag[0] : raw.task_action_tag;
  const { task_status: _s, task_action_tag: _a, ...rest } = raw as any;
  return {
    ...rest,
    status: (statusRow?.name ?? "pending") as TaskStatus,
    action_tag: (actionTagRow?.name ?? "other") as TaskActionTag,
  } as Task;
}

function toInsertPayload(task: CreateTaskInput & { created_by?: string | null }): Record<string, unknown> {
  const { status, action_tag, ...rest } = task as any;
  const payload: Record<string, unknown> = { ...rest };
  payload.status_id = status ? TASK_STATUS_IDS[status as TaskStatus] ?? 1 : 1;
  payload.action_tag_id = action_tag
    ? TASK_ACTION_TAG_IDS[action_tag as TaskActionTag] ?? 10
    : 10;
  return payload;
}

function toUpdatePayload(updates: UpdateTaskInput & { status?: TaskStatus }): Record<string, unknown> {
  const { status, action_tag, ...rest } = updates as any;
  const payload: Record<string, unknown> = { ...rest };
  if (status !== undefined) {
    payload.status_id = TASK_STATUS_IDS[status as TaskStatus] ?? 1;
  }
  if (action_tag !== undefined) {
    payload.action_tag_id = action_tag
      ? TASK_ACTION_TAG_IDS[action_tag as TaskActionTag] ?? 10
      : 10;
  }
  return payload;
}

export async function getTasks(supabase: Client, filters?: TaskFilters) {
  let query = (supabase.from("tasks") as any)
    .select(TASK_SELECT)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status_id", TASK_STATUS_IDS[filters.status]);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.action_tag) {
    query = query.eq("action_tag_id", TASK_ACTION_TAG_IDS[filters.action_tag]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as RawTask[]).map(normalizeTask);
}

export async function getMyTasks(supabase: Client, userId: string, status?: TaskStatus) {
  let query = (supabase.from("tasks") as any)
    .select(TASK_SELECT)
    .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status_id", TASK_STATUS_IDS[status]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as RawTask[]).map(normalizeTask);
}

export async function getTasksByUser(supabase: Client, userId: string) {
  return getMyTasks(supabase, userId);
}

export async function getTasksByTicket(supabase: Client, ticketId: string) {
  const { data, error } = await (supabase.from("tasks") as any)
    .select(TASK_SELECT)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as RawTask[]).map(normalizeTask);
}

export async function getUpcomingTasks(supabase: Client, userId: string, days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await (supabase.from("tasks") as any)
    .select(TASK_SELECT)
    .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    .eq("status_id", TASK_STATUS_IDS.pending)
    .not("due_date", "is", null)
    .lte("due_date", futureDate.toISOString())
    .order("due_date", { ascending: true });

  if (error) throw error;
  return (data as RawTask[]).map(normalizeTask);
}

export async function getAllPendingTasks(supabase: Client) {
  const { data, error } = await (supabase.from("tasks") as any)
    .select(TASK_SELECT)
    .eq("status_id", TASK_STATUS_IDS.pending)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  if (error) throw error;
  return (data as RawTask[]).map(normalizeTask);
}

export async function createTask(supabase: Client, task: CreateTaskInput) {
  const payload = toInsertPayload(task);
  const { data, error } = await (supabase.from("tasks") as any)
    .insert([payload])
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return normalizeTask(data as RawTask);
}

export async function updateTask(supabase: Client, id: string, updates: UpdateTaskInput) {
  const updateData = toUpdatePayload(updates as any);

  if ((updates as any).status === "completed") {
    updateData.completed_at = new Date().toISOString();
  } else if ((updates as any).status === "pending") {
    updateData.completed_at = null;
  }

  const { data, error } = await (supabase.from("tasks") as any)
    .update(updateData)
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return normalizeTask(data as RawTask);
}

export async function completeTask(supabase: Client, id: string, timeSpentMinutes?: number) {
  const updateData: Record<string, unknown> = {
    status_id: TASK_STATUS_IDS.completed,
    completed_at: new Date().toISOString(),
  };
  if (timeSpentMinutes !== undefined) {
    updateData.time_spent_minutes = timeSpentMinutes;
  }

  const { data, error } = await (supabase.from("tasks") as any)
    .update(updateData)
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return normalizeTask(data as RawTask);
}

export async function reopenTask(supabase: Client, id: string) {
  const { data, error } = await (supabase.from("tasks") as any)
    .update({ status_id: TASK_STATUS_IDS.pending, completed_at: null })
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return normalizeTask(data as RawTask);
}

export async function deleteTask(supabase: Client, id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function getTaskStats(supabase: Client, userId?: string): Promise<TaskStats> {
  const now = new Date().toISOString();
  let baseQuery = (supabase.from("tasks") as any).select("id, status_id, due_date");
  if (userId) {
    baseQuery = baseQuery.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
  }

  const { data, error } = await baseQuery;
  if (error) throw error;

  const tasks = (data || []) as Array<{ id: string; status_id: number; due_date: string | null }>;
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status_id === TASK_STATUS_IDS.pending).length,
    completed: tasks.filter((t) => t.status_id === TASK_STATUS_IDS.completed).length,
    overdue: tasks.filter(
      (t) => t.status_id === TASK_STATUS_IDS.pending && t.due_date && t.due_date < now,
    ).length,
  };
}

export async function getTaskById(supabase: Client, id: string) {
  const { data, error } = await (supabase.from("tasks") as any)
    .select(TASK_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return normalizeTask(data as RawTask);
}
