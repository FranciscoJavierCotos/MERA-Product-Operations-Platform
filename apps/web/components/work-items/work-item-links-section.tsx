"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WorkItemTypeBadge } from "./work-item-type-badge";
import { WorkItemStatusBadge } from "./work-item-status-badge";
import { LinkWorkItemDialog } from "@/components/tickets/link-work-item-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  deleteItemLink,
  listLinkTypes,
  listWorkItemInboundLinks,
  listWorkItemOutboundLinks,
} from "@/lib/supabase/queries/item-links";
import type {
  LinkTypeId,
  LinkTypeRow,
  TicketLinkWithTarget,
  WorkItemInboundLink,
} from "@/types/item-link.types";

interface Props {
  workItemId: string;
  canEdit: boolean;
  /**
   * When provided, clicking "+ Add link" calls this callback with the current
   * linkTypes and excludeIds instead of opening an internal Dialog.
   * Use this when WorkItemLinksSection is rendered inside another Dialog, to
   * avoid Radix nested-Dialog focus-trap conflicts.
   */
  onOpenAddLink?: (opts: { linkTypes: LinkTypeRow[]; excludeIds: string[] }) => void;
  /**
   * Increment to force a data re-fetch (e.g. after a link is created externally).
   */
  refreshTrigger?: number;
}

export function WorkItemLinksSection({
  workItemId,
  canEdit,
  onOpenAddLink,
  refreshTrigger,
}: Props) {
  const router = useRouter();
  const [inbound, setInbound] = useState<WorkItemInboundLink[]>([]);
  const [outbound, setOutbound] = useState<TicketLinkWithTarget[]>([]);
  const [linkTypes, setLinkTypes] = useState<LinkTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [types, inboundRows, outboundRows] = await Promise.all([
        listLinkTypes(supabase),
        listWorkItemInboundLinks(supabase, workItemId),
        listWorkItemOutboundLinks(supabase, workItemId),
      ]);
      setLinkTypes(types);
      setInbound(inboundRows);
      setOutbound(outboundRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load links");
    } finally {
      setLoading(false);
    }
  }, [workItemId]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshTrigger]);

  const labelFor = useMemo(() => {
    const map = new Map<LinkTypeId, { label: string; inverse_label: string }>();
    for (const t of linkTypes) {
      map.set(t.id, { label: t.label, inverse_label: t.inverse_label });
    }
    return map;
  }, [linkTypes]);

  const handleDelete = async (linkId: string) => {
    setBusyId(linkId);
    try {
      const supabase = createClient();
      await deleteItemLink(supabase, linkId);
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove link");
    } finally {
      setBusyId(null);
    }
  };

  const excludeIds = useMemo(
    () => [
      workItemId,
      ...outbound.map((o) => o.target_work_item_id),
    ],
    [workItemId, outbound],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-500">
          Linked tickets &amp; items
        </Label>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() =>
              onOpenAddLink
                ? onOpenAddLink({ linkTypes, excludeIds })
                : setDialogOpen(true)
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add link
          </Button>
        )}
      </div>

      <div className="mt-2 space-y-3">
        {loading ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : inbound.length === 0 && outbound.length === 0 ? (
          <p className="text-xs text-gray-400">No links yet.</p>
        ) : (
          <>
            {inbound.map((link) => {
              const label =
                labelFor.get(link.link_type)?.inverse_label ?? link.link_type;
              return (
                <div
                  key={link.id}
                  className="flex items-start justify-between gap-2 rounded border border-gray-200 p-2"
                >
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="font-medium uppercase tracking-wide text-gray-500">
                      {label}
                    </span>
                    {link.source_ticket ? (
                      <Link
                        href={`/tickets/${link.source_ticket.id}`}
                        className="ml-2 inline-flex max-w-full overflow-hidden items-center gap-1.5 text-sm text-gray-900 hover:underline"
                      >
                        <span className="font-mono shrink-0">
                          T-{link.source_ticket.ticket_number}
                        </span>
                        <span className="truncate min-w-0">
                          {link.source_ticket.title}
                        </span>
                      </Link>
                    ) : link.source_work_item ? (
                      <Link
                        href={`/projects/${link.source_work_item.project.key}`}
                        className="ml-2 inline-flex max-w-full overflow-hidden items-center gap-1.5 text-sm text-gray-900 hover:underline"
                      >
                        <span className="font-mono shrink-0">
                          {link.source_work_item.item_key}
                        </span>
                        <WorkItemTypeBadge type={link.source_work_item.type} />
                        <span className="truncate min-w-0">
                          {link.source_work_item.title}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(link.id)}
                      disabled={busyId === link.id}
                      title="Remove link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}

            {outbound.map((link) => {
              const label = labelFor.get(link.link_type)?.label ?? link.link_type;
              return (
                <div
                  key={link.id}
                  className="flex items-start justify-between gap-2 rounded border border-gray-200 p-2"
                >
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="font-medium uppercase tracking-wide text-gray-500">
                      {label}
                    </span>
                    <Link
                      href={`/projects/${link.target.project.key}`}
                      className="ml-2 inline-flex max-w-full overflow-hidden items-center gap-1.5 text-sm text-gray-900 hover:underline"
                    >
                      <span className="font-mono shrink-0">{link.target.item_key}</span>
                      <WorkItemTypeBadge type={link.target.type} />
                      <WorkItemStatusBadge status={link.target.status} />
                      <span className="truncate min-w-0">{link.target.title}</span>
                    </Link>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(link.id)}
                      disabled={busyId === link.id}
                      title="Remove link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Only render internal dialog when parent doesn't handle it externally.
          Rendering a Dialog inside another Dialog causes Radix focus-trap conflicts. */}
      {!onOpenAddLink && (
        <LinkWorkItemDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            refresh();
          }}
          sourceWorkItemId={workItemId}
          linkTypes={linkTypes}
          excludeWorkItemIds={excludeIds}
          defaultIsPrimary={false}
        />
      )}
    </div>
  );
}
