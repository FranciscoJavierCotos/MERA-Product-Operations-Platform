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

export interface TicketFilters {
  search?: string;
  status_id?: number;
  priority_id?: number;
  category_id?: number;
  temperature_id?: number;
  functional_team_id?: string;
  support_team_id?: string;
  assigned_to?: string;
  created_from?: string;
  created_to?: string;
  sort_column?: string;
  sort_dir?: string;
}

const SORTABLE_COLUMNS = new Set([
  "ticket_number",
  "title",
  "category_id",
  "status_id",
  "priority_id",
  "temperature_id",
  "created_at",
  "updated_at",
]);

const TICKET_SELECT = `
  id, ticket_number, title, description, resolution, cc_email,
  status_id, priority_id, category_id, support_level_id, temperature_id,
  created_by, assigned_to, team_id, functional_team_id,
  client_email, client_name, attachments, custom_fields,
  time_worked_minutes, created_at, updated_at, resolved_at, closed_at,
  status:ticket_statuses(id, name, label, badge_variant, is_final, display_order),
  priority:ticket_priorities(id, name, label, color_class, display_order),
  category:ticket_categories(id, name, label, display_order),
  support_level:ticket_support_levels(id, name, label, description, color_class, display_order),
  temperature:ticket_temperatures(id, name, label, emoji, color_class, display_order),
  tags:ticket_tags(tag:tags(id, name, slug, color_class)),
  assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url),
  creator:profiles!tickets_created_by_fkey(id, full_name, email),
  functional_team:teams!tickets_functional_team_id_fkey(id, name),
  support_team:teams!tickets_team_id_fkey(id, name),
  sla_instance:sla_instances(id, response_due_at, resolution_due_at, responded_at, paused_at, total_paused_minutes, policy:sla_policies(name, priority_id, response_time_minutes, resolution_time_minutes))
`;

const TICKET_SELECT_DETAIL = `
  id, ticket_number, title, description, resolution, cc_email,
  status_id, priority_id, category_id, support_level_id, temperature_id,
  created_by, assigned_to, team_id, functional_team_id,
  client_email, client_name, attachments, custom_fields,
  time_worked_minutes, created_at, updated_at, resolved_at, closed_at,
  status:ticket_statuses(id, name, label, badge_variant, is_final, display_order),
  priority:ticket_priorities(id, name, label, color_class, display_order),
  category:ticket_categories(id, name, label, display_order),
  support_level:ticket_support_levels(id, name, label, description, color_class, display_order),
  temperature:ticket_temperatures(id, name, label, emoji, color_class, display_order),
  tags:ticket_tags(tag:tags(id, name, slug, color_class)),
  assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email, avatar_url, role),
  creator:profiles!tickets_created_by_fkey(id, full_name, email),
  functional_team:teams!tickets_functional_team_id_fkey(id, name, category),
  support_team:teams!tickets_team_id_fkey(id, name, category),
  sla_instance:sla_instances(id, response_due_at, resolution_due_at, responded_at, paused_at, total_paused_minutes, policy:sla_policies(name, priority_id, response_time_minutes, resolution_time_minutes))
`;

function applyFilters(query: any, filters?: TicketFilters) {
  if (!filters) return query;
  if (filters.search)           query = query.ilike("title", `%${filters.search}%`);
  if (filters.status_id)        query = query.eq("status_id", filters.status_id);
  if (filters.priority_id)      query = query.eq("priority_id", filters.priority_id);
  if (filters.category_id)      query = query.eq("category_id", filters.category_id);
  if (filters.temperature_id)   query = query.eq("temperature_id", filters.temperature_id);
  if (filters.functional_team_id) query = query.eq("functional_team_id", filters.functional_team_id);
  if (filters.support_team_id)  query = query.eq("team_id", filters.support_team_id);
  if (filters.assigned_to)      query = query.eq("assigned_to", filters.assigned_to);
  if (filters.created_from)     query = query.gte("created_at", `${filters.created_from}T00:00:00.000Z`);
  if (filters.created_to)       query = query.lte("created_at", `${filters.created_to}T23:59:59.999Z`);
  return query;
}

function applySort(query: any, filters?: TicketFilters) {
  const col = filters?.sort_column;
  const ascending = filters?.sort_dir === "asc";
  if (col && SORTABLE_COLUMNS.has(col)) {
    query = query.order(col, { ascending });
    if (col !== "ticket_number") query = query.order("ticket_number", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false }).order("ticket_number", { ascending: false });
  }
  return query;
}

export async function getTickets(
  supabase: Client,
  filters?: {
    status_id?: number;
    priority_id?: number;
    assigned_to?: string;
  },
) {
  let query = supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .order("created_at", { ascending: false })
    .order("ticket_number", { ascending: false });

  if (filters?.status_id)   query = query.eq("status_id", filters.status_id);
  if (filters?.priority_id) query = query.eq("priority_id", filters.priority_id);
  if (filters?.assigned_to) query = query.eq("assigned_to", filters.assigned_to);

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
  filters?: TicketFilters,
): Promise<PaginatedTickets> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("tickets")
    .select(TICKET_SELECT, { count: "exact" });

  query = applyFilters(query, filters);
  query = applySort(query, filters);

  const { data, error, count } = await query.range(from, to);
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
  filters?: Omit<TicketFilters, "assigned_to">,
): Promise<PaginatedTickets> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("tickets")
    .select(TICKET_SELECT, { count: "exact" })
    .eq("assigned_to", userId);

  query = applyFilters(query, filters);
  query = applySort(query, filters);

  const { data, error, count } = await query.range(from, to);
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
    .select(TICKET_SELECT_DETAIL)
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
  ticket: Database["public"]["Tables"]["tickets"]["Insert"],
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
  updates: Partial<Database["public"]["Tables"]["tickets"]["Update"]>,
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
    .select(TICKET_SELECT)
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
  const { data: rawData, error } = await (supabase.from("tickets") as any)
    .select("id, ticket_number")
    .eq("assigned_to", userId)
    .order("ticket_number", { ascending: true });

  if (error) throw error;

  const data = rawData as Array<{ id: string; ticket_number: number }> | null;

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
  const isExactMatch = query.startsWith('"') && query.endsWith('"');
  const searchTerm = isExactMatch ? query.slice(1, -1) : query;

  const selectStr = `
    ${TICKET_SELECT}
  `;

  if (isExactMatch) {
    const { data, error } = await supabase
      .from("tickets")
      .select(selectStr)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false })
      .order("ticket_number", { ascending: false });

    if (error) throw error;
    return data as unknown as Ticket[];
  } else {
    const { data, error } = await supabase
      .from("tickets")
      .select(selectStr)
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

export interface ResolutionMatch {
  id: string;
  ticket_number: number;
  title: string;
  resolution: string | null;
  similarity: number;
}

export async function findSimilarResolutions(
  supabase: Client,
  embedding: number[],
  limit = 5,
  excludeTicketId?: string,
): Promise<ResolutionMatch[]> {
  const { data, error } = await (supabase.rpc as any)("match_resolutions", {
    query_embedding: embedding,
    match_count: limit,
    exclude_ticket_id: excludeTicketId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ResolutionMatch[];
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
