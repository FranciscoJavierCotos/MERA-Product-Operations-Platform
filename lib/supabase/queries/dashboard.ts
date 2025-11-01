import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  myTasks: number;
  resolvedToday: number;
}

export async function getDashboardStats(
  supabase: Client,
  userId: string
): Promise<DashboardStats> {
  // Get total tickets count
  const { count: totalTickets } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true });

  // Get open tickets count
  const { count: openTickets } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);

  // Get user's tasks count
  const { count: myTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", userId)
    .neq("status", "completed");

  // Get tickets resolved today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: resolvedToday } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "resolved")
    .gte("resolved_at", today.toISOString());

  return {
    totalTickets: totalTickets || 0,
    openTickets: openTickets || 0,
    myTasks: myTasks || 0,
    resolvedToday: resolvedToday || 0,
  };
}

export async function getRecentTickets(supabase: Client, limit: number = 10) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email),
      creator:profiles!tickets_created_by_fkey(id, full_name, email)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
