import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Task } from "@/types/task.types";

type Client = SupabaseClient<Database>;

export async function getTasks(
  supabase: Client,
  filters?: { status?: string }
) {
  let query = supabase
    .from("tasks")
    .select(
      `
      *,
      ticket:tickets(id, ticket_number, title, status),
      assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url)
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as Task[];
}

export async function getTasksByUser(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      ticket:tickets(id, ticket_number, title, status),
      assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url)
    `
    )
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Task[];
}

export async function getTasksByTicket(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url)
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Task[];
}

export async function createTask(
  supabase: Client,
  task: {
    title: string;
    description?: string;
    ticket_id?: string;
    assigned_to: string;
    created_by?: string;
    due_date?: string;
  }
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert([task])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(
  supabase: Client,
  id: string,
  updates: Partial<Task>
) {
  const updateData: any = { ...updates };

  if (updates.status === "completed" && !updates.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(supabase: Client, id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;
}
