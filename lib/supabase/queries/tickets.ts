import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import type {
  Ticket,
  TicketComment,
  TicketHistory,
} from "@/types/ticket.types";

type Client = SupabaseClient<Database>;

interface MyTicketNavigation {
  firstTicketId: string | null;
  previousTicketId: string | null;
  nextTicketId: string | null;
}

export async function getTickets(
  supabase: Client,
  filters?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
  },
) {
  let query = supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      functional_team:teams!tickets_functional_team_id_fkey(id, name),
      support_team:teams!tickets_team_id_fkey(id, name)
    `,
    )
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false });

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

export interface PaginatedTickets {
  data: Ticket[];
  totalCount: number;
}

export async function getTicketsPaginated(
  supabase: Client,
  page: number,
  pageSize: number,
  filters?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
  },
): Promise<PaginatedTickets> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      functional_team:teams!tickets_functional_team_id_fkey(id, name),
      support_team:teams!tickets_team_id_fkey(id, name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false })
    .range(from, to);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.assigned_to) query = query.eq("assigned_to", filters.assigned_to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as unknown as Ticket[],
    totalCount: count ?? 0,
  };
}

export async function getMyTicketsPaginated(
  supabase: Client,
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedTickets> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const { data, error, count } = await supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      functional_team:teams!tickets_functional_team_id_fkey(id, name),
      support_team:teams!tickets_team_id_fkey(id, name)
    `,
      { count: "exact" },
    )
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data ?? []) as unknown as Ticket[],
    totalCount: count ?? 0,
  };
}

export async function getTicketById(
  supabase: Client,
  id: string,
): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url, role),
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      functional_team:teams!tickets_functional_team_id_fkey(id, name, category),
      support_team:teams!tickets_team_id_fkey(id, name, category)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as unknown as Ticket;
}

export async function getTicketComments(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select(
      `
      *,
      user:profiles(id, full_name, email, avatar_url)
    `,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TicketComment[];
}

export async function getTicketHistory(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("ticket_history")
    .select(
      `
      *,
      user:profiles(id, full_name, avatar_url)
    `,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TicketHistory[];
}

export async function createTicket(
  supabase: Client,
  ticket: Database["public"]["Tables"]["tickets"]["Insert"] & {
    functional_team_id?: string | null;
    support_level?: "L1" | "L2" | "L3" | null;
    client_temperature?: "hot" | "warm" | "cool" | null;
  },
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
  updates: Partial<Ticket>,
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
  comment: Database["public"]["Tables"]["ticket_comments"]["Insert"],
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
      creator:profiles!tickets_created_by_fkey(id, full_name, email),
      functional_team:teams!tickets_functional_team_id_fkey(id, name),
      support_team:teams!tickets_team_id_fkey(id, name)
    `,
    )
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false });

  if (error) throw error;
  return data as unknown as Ticket[];
}

export async function getMyTicketNavigation(
  supabase: Client,
  userId: string,
  currentTicketId: string,
): Promise<MyTicketNavigation> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, ticket_number")
    .eq("assigned_to", userId)
    .order("ticket_number", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      firstTicketId: null,
      previousTicketId: null,
      nextTicketId: null,
    };
  }

  const currentIndex = data.findIndex((row) => row.id === currentTicketId);

  if (currentIndex === -1) {
    return {
      firstTicketId: data[0]?.id ?? null,
      previousTicketId: null,
      nextTicketId: null,
    };
  }

  return {
    firstTicketId: data[0]?.id ?? null,
    previousTicketId: data[currentIndex - 1]?.id ?? null,
    nextTicketId: data[currentIndex + 1]?.id ?? null,
  };
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
        creator:profiles!tickets_created_by_fkey(id, full_name, email),
        functional_team:teams!tickets_functional_team_id_fkey(id, name),
        support_team:teams!tickets_team_id_fkey(id, name)
      `,
      )
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false })
      .order("ticket_number", { ascending: false });

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
        creator:profiles!tickets_created_by_fkey(id, full_name, email),
        functional_team:teams!tickets_functional_team_id_fkey(id, name),
        support_team:teams!tickets_team_id_fkey(id, name)
      `,
      )
      .textSearch("search_vector", searchTerm, {
        type: "websearch",
        config: "english",
      })
      .order("created_at", { ascending: false })
      .order("ticket_number", { ascending: false });

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
  timeWorkedMinutes: number,
) {
  const { data, error } = await (supabase.from("tickets") as any)
    .update({ time_worked_minutes: timeWorkedMinutes })
    .eq("id", ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
