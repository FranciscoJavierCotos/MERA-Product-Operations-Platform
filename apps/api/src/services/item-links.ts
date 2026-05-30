import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stms/contracts";
import type {
  CreateItemLinkInput,
  ItemLink,
  LinkTypeId,
  LinkTypeRow,
  TicketLinkWithTarget,
  WorkItemInboundLink,
} from "../types/item-link.types";
import type { WorkItemType, WorkItemStatus } from "../types/work-item.types";
import type { SprintStatus } from "../types/sprint.types";

type Client = SupabaseClient<Database>;

const TARGET_SELECT = `
  id, item_key, title, type, status,
  project:projects(id, key, name),
  sprint:sprints(id, name, status, end_date)
`;

type RawTarget = {
  id: string;
  item_key: string;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  project: { id: string; key: string; name: string } | { id: string; key: string; name: string }[] | null;
  sprint: {
    id: string;
    name: string;
    status: SprintStatus;
    end_date: string | null;
  } | { id: string; name: string; status: SprintStatus; end_date: string | null }[] | null;
};

const normalizeTarget = (raw: RawTarget | RawTarget[] | null) => {
  const r = Array.isArray(raw) ? raw[0] ?? null : raw;
  if (!r) return null;
  return {
    id: r.id,
    item_key: r.item_key,
    title: r.title,
    type: r.type,
    status: r.status,
    project: Array.isArray(r.project)
      ? r.project[0] ?? { id: "", key: "", name: "" }
      : r.project ?? { id: "", key: "", name: "" },
    sprint: Array.isArray(r.sprint) ? r.sprint[0] ?? null : r.sprint,
  };
};

// â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function listLinkTypes(supabase: Client): Promise<LinkTypeRow[]> {
  const { data, error } = await supabase
    .from("link_types")
    .select("id, inverse_id, label, inverse_label, is_symmetric, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LinkTypeRow[];
}

// â”€â”€ Ticket â†’ Work Item links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function listTicketLinks(
  supabase: Client,
  ticketId: string,
): Promise<TicketLinkWithTarget[]> {
  const { data, error } = await (supabase.from("ticket_work_item_links") as any)
    .select(`id, ticket_id, work_item_id, link_type, is_primary, note, created_by, created_at,
      target:work_items!ticket_work_item_links_work_item_id_fkey(${TARGET_SELECT})`)
    .eq("ticket_id", ticketId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).flatMap((r) => {
    const target = normalizeTarget(r.target);
    if (!target) return [];
    return [{
      id: r.id,
      source_ticket_id: r.ticket_id,
      source_work_item_id: null,
      target_work_item_id: r.work_item_id,
      link_type: r.link_type as LinkTypeId,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      target,
    } satisfies TicketLinkWithTarget];
  });
}

export async function getPrimaryTicketLink(
  supabase: Client,
  ticketId: string,
): Promise<TicketLinkWithTarget | null> {
  const { data, error } = await (supabase.from("ticket_work_item_links") as any)
    .select(`id, ticket_id, work_item_id, link_type, is_primary, note, created_by, created_at,
      target:work_items!ticket_work_item_links_work_item_id_fkey(${TARGET_SELECT})`)
    .eq("ticket_id", ticketId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const target = normalizeTarget((data as any).target);
  if (!target) return null;
  return {
    id: data.id,
    source_ticket_id: data.ticket_id,
    source_work_item_id: null,
    target_work_item_id: data.work_item_id,
    link_type: data.link_type as LinkTypeId,
    is_primary: data.is_primary,
    note: data.note,
    created_by: data.created_by,
    created_at: data.created_at,
    target,
  };
}

// â”€â”€ Work Item inbound / outbound links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function listWorkItemInboundLinks(
  supabase: Client,
  workItemId: string,
): Promise<WorkItemInboundLink[]> {
  // Inbound from tickets
  const [twiRes, wilRes] = await Promise.all([
    (supabase.from("ticket_work_item_links") as any)
      .select(`id, ticket_id, work_item_id, link_type, is_primary, note, created_by, created_at,
        source_ticket:tickets!ticket_work_item_links_ticket_id_fkey(
          id, ticket_number, title,
          status:ticket_statuses(name)
        )`)
      .eq("work_item_id", workItemId)
      .order("created_at", { ascending: false }),

    (supabase.from("work_item_links") as any)
      .select(`id, source_id, target_id, link_type, is_primary, note, created_by, created_at,
        source_work_item:work_items!work_item_links_source_id_fkey(${TARGET_SELECT})`)
      .eq("target_id", workItemId)
      .order("created_at", { ascending: false }),
  ]);

  if (twiRes.error) throw new Error(twiRes.error.message);
  if (wilRes.error) throw new Error(wilRes.error.message);

  const out: WorkItemInboundLink[] = [];

  for (const r of (twiRes.data ?? []) as any[]) {
    const rawTkt = Array.isArray(r.source_ticket) ? r.source_ticket[0] : r.source_ticket;
    let source_ticket: WorkItemInboundLink["source_ticket"] = null;
    if (rawTkt) {
      const status = Array.isArray(rawTkt.status) ? rawTkt.status[0] : rawTkt.status;
      source_ticket = {
        id: rawTkt.id,
        ticket_number: rawTkt.ticket_number,
        title: rawTkt.title,
        status_name: status?.name ?? "unknown",
      };
    }
    out.push({
      id: r.id,
      source_ticket_id: r.ticket_id,
      source_work_item_id: null,
      target_work_item_id: r.work_item_id,
      link_type: r.link_type as LinkTypeId,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      source_ticket,
      source_work_item: null,
    });
  }

  for (const r of (wilRes.data ?? []) as any[]) {
    const source_work_item = normalizeTarget(r.source_work_item);
    out.push({
      id: r.id,
      source_ticket_id: null,
      source_work_item_id: r.source_id,
      target_work_item_id: r.target_id,
      link_type: r.link_type as LinkTypeId,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      source_ticket: null,
      source_work_item,
    });
  }

  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listWorkItemOutboundLinks(
  supabase: Client,
  workItemId: string,
): Promise<TicketLinkWithTarget[]> {
  const { data, error } = await (supabase.from("work_item_links") as any)
    .select(`id, source_id, target_id, link_type, is_primary, note, created_by, created_at,
      target:work_items!work_item_links_target_id_fkey(${TARGET_SELECT})`)
    .eq("source_id", workItemId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).flatMap((r) => {
    const target = normalizeTarget(r.target);
    if (!target) return [];
    return [{
      id: r.id,
      source_ticket_id: null,
      source_work_item_id: r.source_id,
      target_work_item_id: r.target_id,
      link_type: r.link_type as LinkTypeId,
      is_primary: r.is_primary,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at,
      target,
    } satisfies TicketLinkWithTarget];
  });
}

// â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createItemLink(
  supabase: Client,
  input: CreateItemLinkInput & { created_by?: string | null },
): Promise<{ id: string }> {
  if (input.source_ticket_id) {
    // Ticket â†’ Work Item link
    if (input.is_primary) {
      await (supabase.from("ticket_work_item_links") as any)
        .update({ is_primary: false })
        .eq("ticket_id", input.source_ticket_id)
        .eq("is_primary", true);
    }
    const { data, error } = await (supabase.from("ticket_work_item_links") as any)
      .insert({
        ticket_id: input.source_ticket_id,
        work_item_id: input.target_work_item_id,
        link_type: input.link_type,
        is_primary: input.is_primary ?? false,
        note: input.note ?? null,
        created_by: input.created_by ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data as { id: string };
  }

  if (input.source_work_item_id) {
    // Work Item â†’ Work Item link
    if (input.is_primary) {
      await (supabase.from("work_item_links") as any)
        .update({ is_primary: false })
        .eq("source_id", input.source_work_item_id)
        .eq("is_primary", true);
    }
    const { data, error } = await (supabase.from("work_item_links") as any)
      .insert({
        source_id: input.source_work_item_id,
        target_id: input.target_work_item_id,
        link_type: input.link_type,
        is_primary: input.is_primary ?? false,
        note: input.note ?? null,
        created_by: input.created_by ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data as { id: string };
  }

  throw new Error("Either source_ticket_id or source_work_item_id must be provided");
}

export async function setPrimaryItemLink(supabase: Client, linkId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("set_primary_item_link", { p_link_id: linkId });
  if (error) throw new Error(error.message);
}

export async function deleteItemLink(supabase: Client, linkId: string): Promise<void> {
  // Try ticket_work_item_links first, then work_item_links.
  const { error: e1, count: c1 } = await (supabase.from("ticket_work_item_links") as any)
    .delete({ count: "exact" })
    .eq("id", linkId);
  if (e1) throw new Error(e1.message);
  if ((c1 ?? 0) > 0) return;

  const { error: e2 } = await (supabase.from("work_item_links") as any)
    .delete()
    .eq("id", linkId);
  if (e2) throw new Error(e2.message);
}

// â”€â”€ Search helpers (unchanged) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SearchWorkItemsOptions {
  query: string;
  projectId?: string | null;
  excludeIds?: string[];
  limit?: number;
}

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
    .select("id, item_key, title, type, status, project:projects(id, key, name)")
    .limit(limit);

  if (opts.projectId) query = query.eq("project_id", opts.projectId);
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
    id: string; item_key: string; title: string; type: WorkItemType; status: WorkItemStatus;
    project: { id: string; key: string; name: string } | { id: string; key: string; name: string }[] | null;
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
