import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import type { SlaInstance, SlaStats } from "@/types/sla.types";

type Client = SupabaseClient<Database>;
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

export interface SlaPolicyTargets {
  response_time_minutes: number;
  resolution_time_minutes: number;
}

export type SlaPolicyTargetsByPriority = Partial<
  Record<TicketPriority, SlaPolicyTargets>
>;

const OPEN_STATUSES = [
  "new",
  "pending_customer",
  "pending_internal",
  "escalated",
] as const;

export async function getSlaInstance(
  supabase: Client,
  ticketId: string,
): Promise<SlaInstance | null> {
  const { data, error } = await supabase
    .from("sla_instances")
    .select(
      `
      *,
      policy:sla_policies(*)
    `,
    )
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as SlaInstance | null;
}

export async function getActiveSlaPolicyTargetsByPriority(
  supabase: Client,
): Promise<SlaPolicyTargetsByPriority> {
  const { data, error } = await supabase
    .from("sla_policies")
    .select("priority, response_time_minutes, resolution_time_minutes")
    .eq("is_active", true);

  if (error) throw error;

  return (data ?? []).reduce<SlaPolicyTargetsByPriority>((acc, policy) => {
    acc[policy.priority] = {
      response_time_minutes: policy.response_time_minutes,
      resolution_time_minutes: policy.resolution_time_minutes,
    };
    return acc;
  }, {});
}

export async function getSlaStats(supabase: Client): Promise<SlaStats> {
  const now = new Date().toISOString();
  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const fourHoursLater = new Date(
    Date.now() + 4 * 60 * 60 * 1000,
  ).toISOString();

  // Get IDs of all open tickets
  const { data: openTicketsRaw } = await (supabase as any)
    .from("tickets")
    .select("id")
    .in("status", [...OPEN_STATUSES]);
  const openTickets = openTicketsRaw as Array<{ id: string }> | null;

  const openIds = (openTickets ?? []).map((t) => t.id);

  if (openIds.length === 0) {
    return { breached: 0, due1h: 0, due4h: 0, onTrack: 0 };
  }

  const [
    { count: breached },
    { count: due1h },
    { count: due4h },
    { count: onTrack },
  ] = await Promise.all([
    supabase
      .from("sla_instances")
      .select("*", { count: "exact", head: true })
      .in("ticket_id", openIds)
      .lt("resolution_due_at", now),

    supabase
      .from("sla_instances")
      .select("*", { count: "exact", head: true })
      .in("ticket_id", openIds)
      .gte("resolution_due_at", now)
      .lt("resolution_due_at", oneHourLater),

    supabase
      .from("sla_instances")
      .select("*", { count: "exact", head: true })
      .in("ticket_id", openIds)
      .gte("resolution_due_at", oneHourLater)
      .lt("resolution_due_at", fourHoursLater),

    supabase
      .from("sla_instances")
      .select("*", { count: "exact", head: true })
      .in("ticket_id", openIds)
      .gte("resolution_due_at", fourHoursLater),
  ]);

  return {
    breached: breached ?? 0,
    due1h: due1h ?? 0,
    due4h: due4h ?? 0,
    onTrack: onTrack ?? 0,
  };
}

export async function getMostUrgentSlaTickets(
  supabase: Client,
  limit: number = 5,
) {
  const { data: openTicketsRaw2 } = await (supabase as any)
    .from("tickets")
    .select("id")
    .in("status", [...OPEN_STATUSES]);
  const openTickets2 = openTicketsRaw2 as Array<{ id: string }> | null;

  const openIds = (openTickets2 ?? []).map((t) => t.id);

  if (openIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sla_instances")
    .select(
      `
      *,
      policy:sla_policies(name, priority, resolution_time_minutes),
      ticket:tickets!sla_instances_ticket_id_fkey(
        id, ticket_number, title, status, priority,
        assigned_user:profiles!tickets_assigned_to_fkey(id, full_name)
      )
    `,
    )
    .in("ticket_id", openIds)
    .order("resolution_due_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
