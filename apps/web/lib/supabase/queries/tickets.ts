/**
 * Thin client-side shim around the owned API.
 *
 * Every function here delegates to apiBrowser; the Supabase client
 * argument is accepted only to keep the existing call signatures so
 * the migration stayed small. The arg is unused. Phase 6 will remove
 * the arg from call sites and delete this file entirely.
 *
 * Re-exports the types Server Components still depend on.
 */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  Ticket,
  TicketComment,
  TicketHistory,
} from "@/types/ticket.types";

type AnyClient = unknown;

export interface MyTicketNavigation {
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

export interface PaginatedTickets {
  data: Ticket[];
  totalCount: number;
}

export interface ResolutionMatch {
  id: string;
  ticket_number: number;
  title: string;
  resolution: string | null;
  similarity: number;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getTickets(
  _sb: AnyClient,
  filters?: { status_id?: number; priority_id?: number; assigned_to?: string },
): Promise<Ticket[]> {
  return apiBrowser.get<Ticket[]>("/tickets", filters);
}

export async function getTicketsPaginated(
  _sb: AnyClient,
  page: number,
  pageSize: number,
  filters?: TicketFilters,
): Promise<PaginatedTickets> {
  return apiBrowser.get<PaginatedTickets>("/tickets/paginated", {
    page,
    pageSize,
    ...filters,
  });
}

export async function getMyTicketsPaginated(
  _sb: AnyClient,
  _userId: string,
  page: number,
  pageSize: number,
  filters?: Omit<TicketFilters, "assigned_to">,
): Promise<PaginatedTickets> {
  return apiBrowser.get<PaginatedTickets>("/tickets/me/paginated", {
    page,
    pageSize,
    ...filters,
  });
}

export async function getTicketById(_sb: AnyClient, id: string) {
  return apiBrowser.get<Ticket | null>(`/tickets/${id}`);
}

export async function getTicketComments(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<TicketComment[]>(`/tickets/${ticketId}/comments`);
}

export async function getTicketHistory(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<TicketHistory[]>(`/tickets/${ticketId}/history`);
}

export async function getMyTickets(_sb: AnyClient, _userId: string) {
  return apiBrowser.get<Ticket[]>("/tickets/me");
}

export async function getMyTicketNavigation(
  _sb: AnyClient,
  _userId: string,
  currentTicketId: string,
) {
  return apiBrowser.get<MyTicketNavigation>("/tickets/me/navigation", {
    currentTicketId,
  });
}

export async function searchTickets(_sb: AnyClient, query: string) {
  if (!query.trim()) return [] as Ticket[];
  return apiBrowser.get<Ticket[]>("/tickets/search", { q: query });
}

export async function findSimilarResolutions(
  _sb: AnyClient,
  embedding: number[],
  limit = 5,
  excludeTicketId?: string,
) {
  return apiBrowser.post<ResolutionMatch[]>("/tickets/similar-resolutions", {
    embedding,
    limit,
    excludeTicketId,
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

export async function createTicket(
  _sb: AnyClient,
  ticket: Record<string, unknown>,
) {
  return apiBrowser.post<Ticket>("/tickets", ticket);
}

export async function updateTicket(
  _sb: AnyClient,
  id: string,
  updates: Record<string, unknown>,
) {
  return apiBrowser.patch<Ticket>(`/tickets/${id}`, updates);
}

export async function deleteTicket(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/tickets/${id}`);
  return { success: true } as const;
}

export async function updateTimeWorked(
  _sb: AnyClient,
  ticketId: string,
  timeWorkedMinutes: number,
) {
  return apiBrowser.patch<Ticket>(`/tickets/${ticketId}/time-worked`, {
    time_worked_minutes: timeWorkedMinutes,
  });
}

export async function createComment(
  _sb: AnyClient,
  comment: {
    ticket_id: string;
    content: string;
    time_worked_minutes?: number;
    is_internal?: boolean;
  },
) {
  return apiBrowser.post<TicketComment>(
    `/tickets/${comment.ticket_id}/comments`,
    {
      content: comment.content,
      time_worked_minutes: comment.time_worked_minutes,
      is_internal: comment.is_internal,
    },
  );
}
