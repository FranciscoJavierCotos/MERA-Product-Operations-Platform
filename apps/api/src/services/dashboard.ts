import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
export { getSlaStats, getMostUrgentSlaTickets } from "./slas";

type Client = SupabaseClient<Database>;

// Status IDs: new=1, pending_customer=2, pending_internal=3, escalated=4, resolved=5, closed=6
const OPEN_STATUS_IDS = [1, 2, 3, 4];
const RESOLVED_STATUS_ID = 5;

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  myTasks: number;
  resolvedToday: number;
}

export async function getDashboardStats(
  supabase: Client,
  userId: string,
): Promise<DashboardStats> {
  const { count: totalTickets } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true });

  const { count: openTickets } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .in("status_id", OPEN_STATUS_IDS);

  const { count: myTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", userId)
    .neq("status", "completed");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: resolvedToday } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status_id", RESOLVED_STATUS_ID)
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
      id, ticket_number, title, cc_email,
      status_id, priority_id, category_id, support_level_id, temperature_id,
      created_by, assigned_to, team_id, functional_team_id,
      client_email, client_name, time_worked_minutes, created_at, updated_at,
      resolved_at, closed_at,
      status:ticket_statuses(id, name, label, badge_variant, is_final, display_order),
      priority:ticket_priorities(id, name, label, color_class, display_order),
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email),
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      functional_team:teams!tickets_functional_team_id_fkey(id, name),
      support_team:teams!tickets_team_id_fkey(id, name)
    `,
    )
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
