/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type {
  CreateItemLinkInput,
  LinkTypeRow,
  TicketLinkWithTarget,
  WorkItemInboundLink,
} from "@/types/item-link.types";
import type { WorkItemType, WorkItemStatus } from "@/types/work-item.types";

type AnyClient = unknown;

// ── Reads ────────────────────────────────────────────────────────────────────

/** @deprecated */
export async function listLinkTypes(_sb: AnyClient): Promise<LinkTypeRow[]> {
  return apiBrowser.get<LinkTypeRow[]>("/item-links/types");
}

/** @deprecated */
export async function listTicketLinks(
  _sb: AnyClient,
  ticketId: string,
): Promise<TicketLinkWithTarget[]> {
  return apiBrowser.get<TicketLinkWithTarget[]>(
    `/item-links/tickets/${ticketId}`,
  );
}

/** @deprecated */
export async function getPrimaryTicketLink(
  _sb: AnyClient,
  ticketId: string,
): Promise<TicketLinkWithTarget | null> {
  return apiBrowser.get<TicketLinkWithTarget | null>(
    `/item-links/tickets/${ticketId}/primary`,
  );
}

/** @deprecated */
export async function listWorkItemInboundLinks(
  _sb: AnyClient,
  workItemId: string,
): Promise<WorkItemInboundLink[]> {
  return apiBrowser.get<WorkItemInboundLink[]>(
    `/item-links/work-items/${workItemId}/inbound`,
  );
}

/** @deprecated */
export async function listWorkItemOutboundLinks(
  _sb: AnyClient,
  workItemId: string,
): Promise<TicketLinkWithTarget[]> {
  return apiBrowser.get<TicketLinkWithTarget[]>(
    `/item-links/work-items/${workItemId}/outbound`,
  );
}

export type LinkableWorkItem = {
  id: string;
  item_key: string;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  project: { id: string; key: string; name: string };
};

/** @deprecated */
export async function searchLinkableWorkItems(
  _sb: AnyClient,
  opts: {
    query: string;
    projectId?: string | null;
    excludeIds?: string[];
    limit?: number;
  },
): Promise<LinkableWorkItem[]> {
  const results = await apiBrowser.get<LinkableWorkItem[]>(
    "/item-links/work-items/search",
    {
      q: opts.query,
      projectId: opts.projectId ?? undefined,
      limit: opts.limit,
    },
  );
  if (!opts.excludeIds || opts.excludeIds.length === 0) return results;
  const excluded = new Set(opts.excludeIds);
  return results.filter((r) => !excluded.has(r.id));
}

/** @deprecated */
export async function listLinkableProjects(_sb: AnyClient) {
  return apiBrowser.get<Array<{ id: string; key: string; name: string }>>(
    "/item-links/projects",
  );
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** @deprecated */
export async function createItemLink(
  _sb: AnyClient,
  input: CreateItemLinkInput & { created_by?: string | null },
) {
  // API derives created_by from the JWT; drop the explicit field if present.
  const { created_by: _ignored, ...body } = input;
  return apiBrowser.post("/item-links", body);
}

/** @deprecated */
export async function setPrimaryItemLink(_sb: AnyClient, linkId: string) {
  return apiBrowser.post(`/item-links/${linkId}/primary`);
}

/** @deprecated */
export async function deleteItemLink(_sb: AnyClient, linkId: string) {
  await apiBrowser.del(`/item-links/${linkId}`);
}
