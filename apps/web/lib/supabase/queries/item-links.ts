import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  CreateItemLinkInput,
  LinkTypeId,
  LinkTypeRow,
  TicketLinkWithTarget,
  WorkItemInboundLink,
} from "@/types/item-link.types";
import type { WorkItemType, WorkItemStatus } from "@/types/work-item.types";
import type { SprintStatus } from "@/types/sprint.types";

type Client = SupabaseClient<Database>;

const TARGET_SELECT = `
  target:work_items!item_links_target_work_item_id_fkey(
    id, item_key, title, type, status,
    project:projects(id, key, name),
    sprint:sprints(id, name, status, end_date)
  )
`;

type RawTarget = {
  id: string;
  item_key: string;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  project: { id: string; key: string; name: string } | null;
  sprint: {
    id: string;
    name: string;
    status: SprintStatus;
    end_date: string | null;
  } | null;
};

type RawTicketLinkRow = {
  id: string;
  source_ticket_id: string | null;
  source_work_item_id: string | null;
  target_work_item_id: string;
  link_type: LinkTypeId;
  is_primary: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
  target: RawTarget | RawTarget[] | null;
};

const toTarget = (raw: RawTicketLinkRow["target"]): RawTarget | null => {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
};

const normalizeTarget = (raw: RawTarget | null) => {
  if (!raw) return null;
  return {
    id: raw.id,
    item_key: raw.item_key,
    title: raw.title,
    type: raw.type,
    status: raw.status,
    project: raw.project ?? { id: "", key: "", name: "" },
    sprint: raw.sprint,
  };
};

export async function listLinkTypes(supabase: Client): Promise<LinkTypeRow[]> {
  const { data, error } = await supabase
    .from("link_types")
    .select("id, inverse_id, label, inverse_label, is_symmetric, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LinkTypeRow[];
}

/**
 * Returns all outgoing links from a ticket, joined with the target work item,
 * its project, and (if any) its sprint. Primary first, then by link_type
 * sort_order, then by created_at.
 */
export async function listTicketLinks(
  supabase: Client,
  ticketId: string,
): Promise<TicketLinkWithTarget[]> {
  const { data, error } = await supabase
    .from("item_links")
    .select(
      `
      id, source_ticket_id, source_work_item_id, target_work_item_id,
      link_type, is_primary, note, created_by, created_at,
      ${TARGET_SELECT}
    `,
    )
    .eq("source_ticket_id", ticketId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawTicketLinkRow[];
  const out: TicketLinkWithTarget[] = [];
  for (const r of rows) {
    const target = normalizeTarget(toTarget(r.target));
    if (!target) continue;
    out.push({
      id: r.id,
      source_ticket_id: r.source_ticket_id,
      source_work_item_id: r.source_work_item_id,
      target_work_item_id: r.target_work_item_id,
      link_type: r.link_type,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      target,
    });
  }
  return out;
}

/** Optimized fetch for the mini-section. Returns the primary link only. */
export async function getPrimaryTicketLink(
  supabase: Client,
  ticketId: string,
): Promise<TicketLinkWithTarget | null> {
  const { data, error } = await supabase
    .from("item_links")
    .select(
      `
      id, source_ticket_id, source_work_item_id, target_work_item_id,
      link_type, is_primary, note, created_by, created_at,
      ${TARGET_SELECT}
    `,
    )
    .eq("source_ticket_id", ticketId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as RawTicketLinkRow;
  const target = normalizeTarget(toTarget(row.target));
  if (!target) return null;
  return {
    id: row.id,
    source_ticket_id: row.source_ticket_id,
    source_work_item_id: row.source_work_item_id,
    target_work_item_id: row.target_work_item_id,
    link_type: row.link_type,
    is_primary: row.is_primary,
    note: row.note,
    created_by: row.created_by,
    created_at: row.created_at,
    target,
  };
}

type RawInboundRow = {
  id: string;
  source_ticket_id: string | null;
  source_work_item_id: string | null;
  target_work_item_id: string;
  link_type: LinkTypeId;
  is_primary: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
  source_ticket:
    | { id: string; ticket_number: number; title: string; status: { name: string } | { name: string }[] | null }
    | { id: string; ticket_number: number; title: string; status: { name: string } | { name: string }[] | null }[]
    | null;
  source_work_item: RawTarget | RawTarget[] | null;
};

/**
 * Inbound links pointing at a work_item — used by the reverse-view section
 * inside the work item detail dialog. Returns both ticket and work_item sources.
 */
export async function listWorkItemInboundLinks(
  supabase: Client,
  workItemId: string,
): Promise<WorkItemInboundLink[]> {
  const { data, error } = await supabase
    .from("item_links")
    .select(
      `
      id, source_ticket_id, source_work_item_id, target_work_item_id,
      link_type, is_primary, note, created_by, created_at,
      source_ticket:tickets!item_links_source_ticket_id_fkey(
        id, ticket_number, title,
        status:ticket_statuses(name)
      ),
      source_work_item:work_items!item_links_source_work_item_id_fkey(
        id, item_key, title, type, status,
        project:projects(id, key, name),
        sprint:sprints(id, name, status, end_date)
      )
    `,
    )
    .eq("target_work_item_id", workItemId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawInboundRow[];
  const out: WorkItemInboundLink[] = [];
  for (const r of rows) {
    let source_ticket: WorkItemInboundLink["source_ticket"] = null;
    const rawTkt = Array.isArray(r.source_ticket)
      ? r.source_ticket[0]
      : r.source_ticket;
    if (rawTkt) {
      const status = Array.isArray(rawTkt.status)
        ? rawTkt.status[0]
        : rawTkt.status;
      source_ticket = {
        id: rawTkt.id,
        ticket_number: rawTkt.ticket_number,
        title: rawTkt.title,
        status_name: status?.name ?? "unknown",
      };
    }
    const source_work_item = normalizeTarget(
      Array.isArray(r.source_work_item)
        ? r.source_work_item[0] ?? null
        : r.source_work_item,
    );

    out.push({
      id: r.id,
      source_ticket_id: r.source_ticket_id,
      source_work_item_id: r.source_work_item_id,
      target_work_item_id: r.target_work_item_id,
      link_type: r.link_type,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      source_ticket,
      source_work_item,
    });
  }
  return out;
}

/** Outgoing links from another work item (e.g. STORY-12 → STORY-9 "blocks"). */
export async function listWorkItemOutboundLinks(
  supabase: Client,
  workItemId: string,
): Promise<TicketLinkWithTarget[]> {
  const { data, error } = await supabase
    .from("item_links")
    .select(
      `
      id, source_ticket_id, source_work_item_id, target_work_item_id,
      link_type, is_primary, note, created_by, created_at,
      ${TARGET_SELECT}
    `,
    )
    .eq("source_work_item_id", workItemId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawTicketLinkRow[];
  const out: TicketLinkWithTarget[] = [];
  for (const r of rows) {
    const target = normalizeTarget(toTarget(r.target));
    if (!target) continue;
    out.push({
      id: r.id,
      source_ticket_id: r.source_ticket_id,
      source_work_item_id: r.source_work_item_id,
      target_work_item_id: r.target_work_item_id,
      link_type: r.link_type,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      target,
    });
  }
  return out;
}

export async function createItemLink(
  supabase: Client,
  input: CreateItemLinkInput & { created_by?: string | null },
): Promise<{ id: string }> {
  const payload = {
    source_ticket_id: input.source_ticket_id ?? null,
    source_work_item_id: input.source_work_item_id ?? null,
    target_work_item_id: input.target_work_item_id,
    link_type: input.link_type,
    is_primary: input.is_primary ?? false,
    note: input.note ?? null,
    created_by: input.created_by ?? null,
  };

  // If the new link is marked primary, the partial unique index will refuse
  // a second primary. Unset the existing primary for this source first.
  if (payload.is_primary) {
    if (payload.source_ticket_id) {
      await (supabase.from("item_links") as any)
        .update({ is_primary: false })
        .eq("source_ticket_id", payload.source_ticket_id)
        .eq("is_primary", true);
    } else if (payload.source_work_item_id) {
      await (supabase.from("item_links") as any)
        .update({ is_primary: false })
        .eq("source_work_item_id", payload.source_work_item_id)
        .eq("is_primary", true);
    }
  }

  const { data, error } = await (supabase.from("item_links") as any)
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function setPrimaryItemLink(
  supabase: Client,
  linkId: string,
): Promise<void> {
  const { error } = await (supabase.rpc as any)("set_primary_item_link", {
    p_link_id: linkId,
  });
  if (error) throw new Error(error.message);
}

export async function deleteItemLink(
  supabase: Client,
  linkId: string,
): Promise<void> {
  const { error } = await supabase.from("item_links").delete().eq("id", linkId);
  if (error) throw new Error(error.message);
}

export interface SearchWorkItemsOptions {
  query: string;
  projectId?: string | null;
  excludeIds?: string[];
  limit?: number;
}

/**
 * Search work items by item_key OR title (case-insensitive). Filtered by RLS
 * server-side, so a non-project member sees nothing.
 */
export async function searchLinkableWorkItems(
  supabase: Client,
  opts: SearchWorkItemsOptions,
): Promise<
  Array<{
    id: string;
    item_key: string;
    title: string;
    type: WorkItemType;
    status: WorkItemStatus;
    project: { id: string; key: string; name: string };
  }>
> {
  const limit = opts.limit ?? 20;
  const q = opts.query.trim();

  let query = supabase
    .from("work_items")
    .select(
      `id, item_key, title, type, status, project:projects(id, key, name)`,
    )
    .limit(limit);

  if (opts.projectId) {
    query = query.eq("project_id", opts.projectId);
  }
  if (q.length > 0) {
    const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.or(`item_key.ilike.%${escaped}%,title.ilike.%${escaped}%`);
  }
  if (opts.excludeIds && opts.excludeIds.length > 0) {
    query = query.not("id", "in", `(${opts.excludeIds.join(",")})`);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    item_key: string;
    title: string;
    type: WorkItemType;
    status: WorkItemStatus;
    project:
      | { id: string; key: string; name: string }
      | { id: string; key: string; name: string }[]
      | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    item_key: r.item_key,
    title: r.title,
    type: r.type,
    status: r.status,
    project: Array.isArray(r.project)
      ? r.project[0] ?? { id: "", key: "", name: "" }
      : r.project ?? { id: "", key: "", name: "" },
  }));
}

/** Lightweight list of projects, filtered by RLS — used to populate the project filter in the picker. */
export async function listLinkableProjects(
  supabase: Client,
): Promise<Array<{ id: string; key: string; name: string }>> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, key, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; key: string; name: string }>;
}
