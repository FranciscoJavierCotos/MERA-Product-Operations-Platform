import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import {
  Task,
  TaskStatus,
  TaskFilters,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStats,
} from "@/types/task.types";

type Client = SupabaseClient<Database>;

const TASK_SELECT = `
  *,
  ticket:tickets(id, ticket_number, title, status_id),
  assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url),
  creator:profiles!tasks_created_by_fkey(id, full_name, email, avatar_url)
`;

/**
 * Get all tasks with optional filters
 */
export async function getTasks(supabase: Client, filters?: TaskFilters) {
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.action_tag) {
    query = query.eq("action_tag", filters.action_tag);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as Task[];
}

/**
 * Get tasks assigned to or created by a specific user
 */
export async function getMyTasks(
  supabase: Client,
  userId: string,
  status?: TaskStatus,
) {
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as Task[];
}

/**
 * Get tasks assigned to a specific user (legacy function for backward compatibility)
 */
export async function getTasksByUser(supabase: Client, userId: string) {
  return getMyTasks(supabase, userId);
}

/**
 * Get all tasks for a specific ticket
 */
export async function getTasksByTicket(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Task[];
}

/**
 * Get tasks due within specified days for a user
 */
export async function getUpcomingTasks(
  supabase: Client,
  userId: string,
  days: number = 7,
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    .eq("status", "pending")
    .not("due_date", "is", null)
    .lte("due_date", futureDate.toISOString())
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data as unknown as Task[];
}

/**
 * Get all pending tasks across all users (admin only)
 */
export async function getAllPendingTasks(supabase: Client) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  if (error) throw error;
  return data as unknown as Task[];
}

/**
 * Create a new task
 */
export async function createTask(supabase: Client, task: CreateTaskInput) {
  const { data, error } = await (supabase.from("tasks") as any)
    .insert([task])
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return data as Task;
}

/**
 * Update a task
 */
export async function updateTask(
  supabase: Client,
  id: string,
  updates: UpdateTaskInput,
) {
  const updateData: Record<string, unknown> = { ...updates };

  // Auto-set completed_at when status changes to completed
  if (updates.status === "completed") {
    updateData.completed_at = new Date().toISOString();
  } else if (updates.status === "pending") {
    updateData.completed_at = null;
  }

  const { data, error } = await (supabase.from("tasks") as any)
    .update(updateData)
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return data as Task;
}

/**
 * Complete a task with optional time tracking
 */
export async function completeTask(
  supabase: Client,
  id: string,
  timeSpentMinutes?: number,
) {
  const updateData: Record<string, unknown> = {
    status: "completed",
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
  return data as Task;
}

/**
 * Reopen a completed task
 */
export async function reopenTask(supabase: Client, id: string) {
  const { data, error } = await (supabase.from("tasks") as any)
    .update({
      status: "pending",
      completed_at: null,
    })
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return data as Task;
}

/**
 * Delete a task
 */
export async function deleteTask(supabase: Client, id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Get task statistics for a user (or all tasks if userId is not provided for admins)
 */
export async function getTaskStats(
  supabase: Client,
  userId?: string,
): Promise<TaskStats> {
  const now = new Date().toISOString();

  // Build base query - use any to handle dynamic schema
  let baseQuery = (supabase.from("tasks") as any).select(
    "id, status, due_date",
  );

  if (userId) {
    baseQuery = baseQuery.or(
      `assigned_to.eq.${userId},created_by.eq.${userId}`,
    );
  }

  const { data, error } = await baseQuery;

  if (error) throw error;

  const tasks = (data || []) as Array<{
    id: string;
    status: string;
    due_date: string | null;
  }>;

  const stats: TaskStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter(
      (t) => t.status === "pending" && t.due_date && t.due_date < now,
    ).length,
  };

  return stats;
}

/**
 * Get a single task by ID
 */
export async function getTaskById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Task;
}
