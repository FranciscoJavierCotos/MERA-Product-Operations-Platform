"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkItemTypeBadge } from "@/components/work-items/work-item-type-badge";
import { WorkItemStatusBadge } from "@/components/work-items/work-item-status-badge";
import { LinkWorkItemDialog } from "./link-work-item-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  deleteItemLink,
  setPrimaryItemLink,
} from "@/lib/supabase/queries/item-links";
import type {
  LinkTypeId,
  LinkTypeRow,
  TicketLinkWithTarget,
} from "@/types/item-link.types";

interface Props {
  ticketId: string;
  links: TicketLinkWithTarget[];
  linkTypes: LinkTypeRow[];
  canEdit: boolean;
}

export function TicketLinksSection({
  ticketId,
  links,
  linkTypes,
  canEdit,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labelFor = useMemo(() => {
    const map = new Map<LinkTypeId, string>();
    for (const t of linkTypes) map.set(t.id, t.label);
    return (id: LinkTypeId) => map.get(id) ?? id;
  }, [linkTypes]);

  const grouped = useMemo(() => {
    const byType = new Map<LinkTypeId, TicketLinkWithTarget[]>();
    for (const l of links) {
      const arr = byType.get(l.link_type) ?? [];
      arr.push(l);
      byType.set(l.link_type, arr);
    }
    const order = new Map<LinkTypeId, number>(
      linkTypes.map((t) => [t.id, t.sort_order]),
    );
    return [...byType.entries()].sort(
      (a, b) => (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999),
    );
  }, [links, linkTypes]);

  const excludeIds = useMemo(
    () => links.map((l) => l.target_work_item_id),
    [links],
  );

  const handleDelete = async (linkId: string) => {
    setBusyId(linkId);
    setError(null);
    try {
      const supabase = createClient();
      await deleteItemLink(supabase, linkId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove link");
    } finally {
      setBusyId(null);
    }
  };

  const handleMakePrimary = async (linkId: string) => {
    setBusyId(linkId);
    setError(null);
    try {
      const supabase = createClient();
      await setPrimaryItemLink(supabase, linkId);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update primary link",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">Scrum links</h2>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add link
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-gray-500">No scrum links yet.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([type, rows]) => (
              <div key={type}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {labelFor(type)}
                </p>
                <ul className="space-y-2">
                  {rows.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {link.is_primary && (
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          )}
                          <Link
                            href={`/projects/${link.target.project.key}`}
                            className="font-mono text-sm font-semibold text-gray-900 hover:underline"
                          >
                            {link.target.item_key}
                          </Link>
                          <WorkItemTypeBadge type={link.target.type} />
                          <WorkItemStatusBadge status={link.target.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-800">
                          {link.target.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {link.target.project.name}
                          {link.target.sprint
                            ? ` · ${link.target.sprint.name}`
                            : " · Backlog"}
                        </p>
                        {link.note && (
                          <p className="mt-1 text-xs italic text-gray-600">
                            {link.note}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 gap-1">
                          {!link.is_primary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleMakePrimary(link.id)}
                              disabled={busyId === link.id}
                              title="Make primary"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </CardContent>

      <LinkWorkItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        ticketId={ticketId}
        linkTypes={linkTypes}
        excludeWorkItemIds={excludeIds}
        defaultIsPrimary={links.every((l) => !l.is_primary)}
      />
    </Card>
  );
}
