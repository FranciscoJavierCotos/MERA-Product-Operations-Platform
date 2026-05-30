import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@stms/contracts";
import type { SlaInstance, SlaPolicy, SlaStats } from "../types/sla.types";

type Client = SupabaseClient<Database>;

// Priority IDs: low=1, medium=2, high=3, urgent=4
export interface SlaPolicyTargets {
  response_time_minutes: number;
  resolution_time_minutes: number;
}

export type SlaPolicyTargetsByPriorityId = Partial<Record<number, SlaPolicyTargets>>;

// Status IDs: new=1, pending_customer=2, pending_internal=3, escalated=4
const OPEN_STATUS_IDS = [1, 2, 3, 4];

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

export async function getActiveSlaPolicyTargetsByPriorityId(
  supabase: Client,
): Promise<SlaPolicyTargetsByPriorityId> {
  const { data: rawData, error } = await (supabase.from("sla_policies") as any)
    .select("priority_id, response_time_minutes, resolution_time_minutes")
    .eq("is_active", true);

  if (error) throw error;

  const data = rawData as Array<{ priority_id: number; response_time_minutes: number; resolution_time_minutes: number }> | null;

  return (data ?? []).reduce<SlaPolicyTargetsByPriorityId>((acc, policy) => {
    acc[policy.priority_id] = {
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

  const { data: openTicketsRaw } = await (supabase as any)
    .from("tickets")
    .select("id")
    .in("status_id", OPEN_STATUS_IDS);
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

export async function getAllSlaPolicies(
  supabase: Client,
): Promise<SlaPolicy[]> {
  const { data, error } = await (supabase.from("sla_policies") as any)
    .select("*")
    .order("priority_id");
  if (error) throw error;
  return (data ?? []) as SlaPolicy[];
}

export async function createSlaPolicy(
  supabase: Client,
  input: Omit<SlaPolicy, "id" | "created_at" | "updated_at">,
): Promise<SlaPolicy> {
  const { data, error } = await (supabase.from("sla_policies") as any)
    .insert([input])
    .select("*")
    .single();
  if (error) throw error;
  return data as SlaPolicy;
}

export async function updateSlaPolicy(
  supabase: Client,
  id: string,
  input: Partial<Omit<SlaPolicy, "id" | "created_at" | "updated_at">>,
): Promise<SlaPolicy> {
  const { data, error } = await (supabase.from("sla_policies") as any)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as SlaPolicy;
}

export async function deleteSlaPolicy(
  supabase: Client,
  id: string,
): Promise<void> {
  const { error } = await (supabase.from("sla_policies") as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getMostUrgentSlaTickets(
  supabase: Client,
  limit: number = 5,
) {
  const { data: openTicketsRaw } = await (supabase as any)
    .from("tickets")
    .select("id")
    .in("status_id", OPEN_STATUS_IDS);
  const openTickets = openTicketsRaw as Array<{ id: string }> | null;

  const openIds = (openTickets ?? []).map((t) => t.id);

  if (openIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sla_instances")
    .select(
      `
      *,
      policy:sla_policies(name, priority_id, resolution_time_minutes),
      ticket:tickets!sla_instances_ticket_id_fkey(
        id, ticket_number, title, status_id, priority_id,
        status:ticket_statuses(id, name, label, badge_variant, is_final, display_order),
        priority:ticket_priorities(id, name, label, color_class, display_order),
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
