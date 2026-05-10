import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketSupportLevelRow,
  TicketTemperatureRow,
  TicketTagRow,
} from "@/types/ticket.types";

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
