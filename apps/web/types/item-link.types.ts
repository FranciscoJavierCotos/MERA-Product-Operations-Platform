import type { WorkItemType, WorkItemStatus } from "./work-item.types";
import type { SprintStatus } from "./sprint.types";

export type LinkTypeId =
  | "implements"
  | "implemented_by"
  | "blocks"
  | "blocked_by"
  | "depends_on"
  | "depended_on_by"
  | "duplicates"
  | "duplicated_by"
  | "caused_by"
  | "causes"
  | "relates_to";

export interface LinkTypeRow {
  id: LinkTypeId;
  inverse_id: LinkTypeId;
  label: string;
  inverse_label: string;
  is_symmetric: boolean;
  sort_order: number;
}

export interface ItemLink {
  id: string;
  source_ticket_id: string | null;
  source_work_item_id: string | null;
  target_work_item_id: string;
  link_type: LinkTypeId;
  is_primary: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LinkedWorkItem {
  id: string;
  item_key: string;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  project: {
    id: string;
    key: string;
    name: string;
  };
  sprint: {
    id: string;
    name: string;
    status: SprintStatus;
    end_date: string | null;
  } | null;
}

export interface LinkedTicket {
  id: string;
  ticket_number: number;
  title: string;
  status_name: string;
}

/** Outgoing link from a ticket → work item, joined for display. */
export interface TicketLinkWithTarget extends ItemLink {
  target: LinkedWorkItem;
}

/** Inbound link landing on a work item — source can be a ticket or another work item. */
export interface WorkItemInboundLink extends ItemLink {
  source_ticket: LinkedTicket | null;
  source_work_item: LinkedWorkItem | null;
}

export interface CreateItemLinkInput {
  source_ticket_id?: string | null;
  source_work_item_id?: string | null;
  target_work_item_id: string;
  link_type: LinkTypeId;
  is_primary?: boolean;
  note?: string | null;
}
