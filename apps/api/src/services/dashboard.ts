import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@stms/contracts";
export { getSlaStats, getMostUrgentSlaTickets } from "./slas";
import { getSlaStats } from "./slas";

type Client = SupabaseClient<Database>;

// Status IDs: new=1, pending_customer=2, pending_internal=3, escalated=4, resolved=5, closed=6
const OPEN_STATUS_IDS = [1, 2, 3, 4];
const RESOLVED_STATUS_ID = 5;

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  myTasks: number;
  resolvedToday: number;
  breachedSlas: number;
  atRiskCompanies: number;
  hotTickets: number;
}

export async function getDashboardStats(
  supabase: Client,
  userId: string,
): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Prefetch lookup IDs needed for new counts
  const [hotTempResult, riskStatusResult] = await Promise.all([
    supabase
      .from("ticket_temperatures")
      .select("id")
      .eq("name", "hot")
      .maybeSingle(),
    supabase
      .from("company_health_statuses")
      .select("id")
      .in("name", ["critical", "at_risk"]),
  ]);

  const hotTempId = hotTempResult.data?.id ?? null;
  const riskStatusIds = (riskStatusResult.data ?? []).map((s: { id: number }) => s.id);

  // Run all counts in parallel
  const [
    totalResult,
    openResult,
    myTasksResult,
    resolvedResult,
    slaStats,
    atRiskResult,
    hotResult,
  ] = await Promise.all([
    supabase.from("tickets").select("*", { count: "exact", head: true }),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .in("status_id", OPEN_STATUS_IDS),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .neq("status_id", 2),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status_id", RESOLVED_STATUS_ID)
      .gte("resolved_at", today.toISOString()),
    getSlaStats(supabase),
    riskStatusIds.length > 0
      ? supabase
          .from("companies")
          .select("*", { count: "exact", head: true })
          .in("health_status_id", riskStatusIds)
      : Promise.resolve({ count: 0 }),
    hotTempId !== null
      ? supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("status_id", OPEN_STATUS_IDS)
          .eq("temperature_id", hotTempId)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    totalTickets: totalResult.count || 0,
    openTickets: openResult.count || 0,
    myTasks: myTasksResult.count || 0,
    resolvedToday: resolvedResult.count || 0,
    breachedSlas: slaStats.breached,
    atRiskCompanies: (atRiskResult as { count: number | null }).count || 0,
    hotTickets: (hotResult as { count: number | null }).count || 0,
  };
}

export async function getRecentTickets(supabase: Client, limit: number = 10) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, title, cc_email,
      status_id, priority_id, category_id, support_level_id, temperature_id,
      created_by, assigned_to, team_id,
      client_email, client_name, time_worked_minutes, created_at, updated_at,
      resolved_at, closed_at,
      status:ticket_statuses(id, name, label, badge_variant, is_final, display_order),
      priority:ticket_priorities(id, name, label, color_class, display_order),
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email),
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      team:teams!tickets_team_id_fkey(id, name, team_type, support_level)
    `,
    )
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getAtRiskCompanies(supabase: Client, limit: number = 5) {
  const { data: riskStatuses } = await supabase
    .from("company_health_statuses")
    .select("id")
    .in("name", ["critical", "at_risk"]);

  if (!riskStatuses || riskStatuses.length === 0) return [];

  const riskIds = riskStatuses.map((s: { id: number }) => s.id);

  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      id, name, logo_url, health_status_id,
      healthStatus:company_health_statuses!companies_health_status_id_fkey(
        id, name, label, emoji, color_class, level
      )
    `,
    )
    .in("health_status_id", riskIds)
    .order("health_status_id", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getHotTickets(supabase: Client, limit: number = 5) {
  const { data: hotTemp } = await supabase
    .from("ticket_temperatures")
    .select("id")
    .eq("name", "hot")
    .maybeSingle();

  if (!hotTemp) return [];

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, title, created_at,
      status:ticket_statuses(id, name, label, badge_variant),
      priority:ticket_priorities(id, name, label, color_class, display_order),
      temperature:ticket_temperatures(id, name, label, emoji, color_class),
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email),
      company:companies!tickets_company_id_fkey(id, name)
    `,
    )
    .in("status_id", OPEN_STATUS_IDS)
    .eq("temperature_id", hotTemp.id)
    .order("priority_id", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
