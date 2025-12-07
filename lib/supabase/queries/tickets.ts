import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Ticket, TicketComment } from "@/types/ticket.types";

type Client = SupabaseClient<Database>;

export async function getTickets(
  supabase: Client,
  filters?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
  }
) {
  let query = supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
      creator:profiles!tickets_created_by_fkey(id, full_name, email)
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as Ticket[];
}

export async function getTicketById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url, role),
      creator:profiles!tickets_created_by_fkey(id, full_name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Ticket;
}

export async function getTicketComments(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select(
      `
      *,
      user:profiles(id, full_name, email, avatar_url)
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TicketComment[];
}

export async function createTicket(
  supabase: Client,
  ticket: Database["public"]["Tables"]["tickets"]["Insert"]
) {
  const { data, error } = await (supabase.from("tickets") as any)
    .insert([ticket])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTicket(
  supabase: Client,
  id: string,
  updates: Partial<Ticket>
) {
  const { data, error } = await (supabase.from("tickets") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createComment(
  supabase: Client,
  comment: Database["public"]["Tables"]["ticket_comments"]["Insert"]
) {
  const { data, error } = await (supabase.from("ticket_comments") as any)
    .insert([comment])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyTickets(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
      creator:profiles!tickets_created_by_fkey(id, full_name, email)
    `
    )
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Ticket[];
}

export async function searchTickets(supabase: Client, query: string) {
  // Check if the query is wrapped in quotes for exact match
  const isExactMatch = query.startsWith('"') && query.endsWith('"');
  const searchTerm = isExactMatch ? query.slice(1, -1) : query;

  if (isExactMatch) {
    // Exact match search - search in title and description using case-insensitive like
    const { data, error } = await supabase
      .from("tickets")
      .select(
        `
        *,
        assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
        creator:profiles!tickets_created_by_fkey(id, full_name, email)
      `
      )
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as Ticket[];
  } else {
    // Fuzzy search using PostgreSQL full-text search
    const { data, error } = await supabase
      .from("tickets")
      .select(
        `
        *,
        assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
        creator:profiles!tickets_created_by_fkey(id, full_name, email)
      `
      )
      .textSearch("search_vector", searchTerm, {
        type: "websearch",
        config: "english",
      })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as Ticket[];
  }
}

export async function deleteTicket(supabase: Client, id: string) {
  const { error } = await supabase.from("tickets").delete().eq("id", id);

  if (error) throw error;
  return { success: true };
}

export async function updateTimeWorked(
  supabase: Client,
  ticketId: string,
  timeWorkedMinutes: number
) {
  const { data, error } = await (supabase.from("tickets") as any)
    .update({ time_worked_minutes: timeWorkedMinutes })
    .eq("id", ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
