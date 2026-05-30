import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@stms/contracts";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketSupportLevelRow,
  TicketTemperatureRow,
  TicketTagRow,
} from "../types/ticket.types";

type Client = SupabaseClient<Database>;

export async function getTicketStatuses(supabase: Client): Promise<TicketStatusRow[]> {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data as TicketStatusRow[];
}

export async function getTicketPriorities(supabase: Client): Promise<TicketPriorityRow[]> {
  const { data, error } = await supabase
    .from("ticket_priorities")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data as TicketPriorityRow[];
}

export async function getTicketCategories(supabase: Client): Promise<TicketCategoryRow[]> {
  const { data, error } = await supabase
    .from("ticket_categories")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data as TicketCategoryRow[];
}

export async function getTicketSupportLevels(supabase: Client): Promise<TicketSupportLevelRow[]> {
  const { data, error } = await supabase
    .from("ticket_support_levels")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data as TicketSupportLevelRow[];
}

export async function getTicketTemperatures(supabase: Client): Promise<TicketTemperatureRow[]> {
  const { data, error } = await supabase
    .from("ticket_temperatures")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data as TicketTemperatureRow[];
}

export async function getTags(supabase: Client): Promise<TicketTagRow[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as TicketTagRow[];
}

export async function getCompanyHealthStatuses(supabase: Client) {
  const { data, error } = await supabase
    .from("company_health_statuses")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return data;
}

// â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Ticket Statuses
export async function createTicketStatus(
  supabase: Client,
  input: Omit<TicketStatusRow, "id">,
): Promise<TicketStatusRow> {
  const { data, error } = await (supabase.from("ticket_statuses") as any)
    .insert([input])
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketStatusRow;
}

export async function updateTicketStatus(
  supabase: Client,
  id: number,
  input: Partial<Omit<TicketStatusRow, "id">>,
): Promise<TicketStatusRow> {
  const { data, error } = await (supabase.from("ticket_statuses") as any)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketStatusRow;
}

export async function deleteTicketStatus(
  supabase: Client,
  id: number,
): Promise<void> {
  const { error } = await (supabase.from("ticket_statuses") as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Ticket Priorities
export async function createTicketPriority(
  supabase: Client,
  input: Omit<TicketPriorityRow, "id">,
): Promise<TicketPriorityRow> {
  const { data, error } = await (supabase.from("ticket_priorities") as any)
    .insert([input])
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketPriorityRow;
}

export async function updateTicketPriority(
  supabase: Client,
  id: number,
  input: Partial<Omit<TicketPriorityRow, "id">>,
): Promise<TicketPriorityRow> {
  const { data, error } = await (supabase.from("ticket_priorities") as any)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketPriorityRow;
}

export async function deleteTicketPriority(
  supabase: Client,
  id: number,
): Promise<void> {
  const { error } = await (supabase.from("ticket_priorities") as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Ticket Categories
export async function createTicketCategory(
  supabase: Client,
  input: Omit<TicketCategoryRow, "id">,
): Promise<TicketCategoryRow> {
  const { data, error } = await (supabase.from("ticket_categories") as any)
    .insert([input])
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketCategoryRow;
}

export async function updateTicketCategory(
  supabase: Client,
  id: number,
  input: Partial<Omit<TicketCategoryRow, "id">>,
): Promise<TicketCategoryRow> {
  const { data, error } = await (supabase.from("ticket_categories") as any)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketCategoryRow;
}

export async function deleteTicketCategory(
  supabase: Client,
  id: number,
): Promise<void> {
  const { error } = await (supabase.from("ticket_categories") as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Tags
export async function createTag(
  supabase: Client,
  input: Omit<TicketTagRow, "id">,
): Promise<TicketTagRow> {
  const { data, error } = await (supabase.from("tags") as any)
    .insert([input])
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketTagRow;
}

export async function updateTag(
  supabase: Client,
  id: string,
  input: Partial<Omit<TicketTagRow, "id">>,
): Promise<TicketTagRow> {
  const { data, error } = await (supabase.from("tags") as any)
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TicketTagRow;
}

export async function deleteTag(supabase: Client, id: string): Promise<void> {
  const { error } = await (supabase.from("tags") as any).delete().eq("id", id);
  if (error) throw error;
}
