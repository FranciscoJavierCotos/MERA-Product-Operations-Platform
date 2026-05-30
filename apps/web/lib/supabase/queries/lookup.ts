/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketSupportLevelRow,
  TicketTemperatureRow,
  TicketTagRow,
} from "@/types/ticket.types";

type AnyClient = unknown;

/** @deprecated */
export async function getTicketStatuses(_sb: AnyClient) {
  return apiBrowser.get<TicketStatusRow[]>("/lookup/statuses");
}
/** @deprecated */
export async function getTicketPriorities(_sb: AnyClient) {
  return apiBrowser.get<TicketPriorityRow[]>("/lookup/priorities");
}
/** @deprecated */
export async function getTicketCategories(_sb: AnyClient) {
  return apiBrowser.get<TicketCategoryRow[]>("/lookup/categories");
}
/** @deprecated */
export async function getTicketSupportLevels(_sb: AnyClient) {
  return apiBrowser.get<TicketSupportLevelRow[]>("/lookup/support-levels");
}
/** @deprecated */
export async function getTicketTemperatures(_sb: AnyClient) {
  return apiBrowser.get<TicketTemperatureRow[]>("/lookup/temperatures");
}
/** @deprecated */
export async function getTags(_sb: AnyClient) {
  return apiBrowser.get<TicketTagRow[]>("/lookup/tags");
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** @deprecated */
export async function createTicketStatus(_sb: AnyClient, input: Omit<TicketStatusRow, "id">) {
  return apiBrowser.post<TicketStatusRow>("/lookup/statuses", input);
}
/** @deprecated */
export async function updateTicketStatus(
  _sb: AnyClient,
  id: number,
  input: Partial<Omit<TicketStatusRow, "id">>,
) {
  return apiBrowser.patch<TicketStatusRow>(`/lookup/statuses/${id}`, input);
}
/** @deprecated */
export async function deleteTicketStatus(_sb: AnyClient, id: number) {
  await apiBrowser.del(`/lookup/statuses/${id}`);
}

/** @deprecated */
export async function createTicketPriority(_sb: AnyClient, input: Omit<TicketPriorityRow, "id">) {
  return apiBrowser.post<TicketPriorityRow>("/lookup/priorities", input);
}
/** @deprecated */
export async function updateTicketPriority(
  _sb: AnyClient,
  id: number,
  input: Partial<Omit<TicketPriorityRow, "id">>,
) {
  return apiBrowser.patch<TicketPriorityRow>(`/lookup/priorities/${id}`, input);
}
/** @deprecated */
export async function deleteTicketPriority(_sb: AnyClient, id: number) {
  await apiBrowser.del(`/lookup/priorities/${id}`);
}

/** @deprecated */
export async function createTicketCategory(_sb: AnyClient, input: Omit<TicketCategoryRow, "id">) {
  return apiBrowser.post<TicketCategoryRow>("/lookup/categories", input);
}
/** @deprecated */
export async function updateTicketCategory(
  _sb: AnyClient,
  id: number,
  input: Partial<Omit<TicketCategoryRow, "id">>,
) {
  return apiBrowser.patch<TicketCategoryRow>(`/lookup/categories/${id}`, input);
}
/** @deprecated */
export async function deleteTicketCategory(_sb: AnyClient, id: number) {
  await apiBrowser.del(`/lookup/categories/${id}`);
}

/** @deprecated */
export async function createTag(_sb: AnyClient, input: Omit<TicketTagRow, "id">) {
  return apiBrowser.post<TicketTagRow>("/lookup/tags", input);
}
/** @deprecated */
export async function updateTag(
  _sb: AnyClient,
  id: number,
  input: Partial<Omit<TicketTagRow, "id">>,
) {
  return apiBrowser.patch<TicketTagRow>(`/lookup/tags/${id}`, input);
}
/** @deprecated */
export async function deleteTag(_sb: AnyClient, id: number) {
  await apiBrowser.del(`/lookup/tags/${id}`);
}
