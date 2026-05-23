"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkItemTypeBadge } from "@/components/work-items/work-item-type-badge";
import { WorkItemStatusBadge } from "@/components/work-items/work-item-status-badge";
import { LinkWorkItemDialog } from "./link-work-item-dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteItemLink } from "@/lib/supabase/queries/item-links";
import { formatDate } from "@/lib/utils/date";
import type {
  LinkTypeRow,
  TicketLinkWithTarget,
} from "@/types/item-link.types";

interface Props {
  ticketId: string;
  primary: TicketLinkWithTarget | null;
  linkTypes: LinkTypeRow[];
  excludeWorkItemIds: string[];
  canEdit: boolean;
}

export function LinkedScrumItemCard({
  ticketId,
  primary,
  linkTypes,
  excludeWorkItemIds,
  canEdit,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlink = async () => {
    if (!primary) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await deleteItemLink(supabase, primary.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink");
    } finally {
      setBusy(false);
    }
  };

  const linkTypeLabel =
    linkTypes.find((t) => t.id === primary?.link_type)?.label ??
    primary?.link_type ??
    "";

  return (
    <>
      <Card className="border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary-700" />
              <h2 className="text-base font-semibold text-primary-900">
                Linked scrum item
              </h2>
            </div>
            {primary && canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={busy}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Change primary link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleUnlink}
                    className="text-red-600 focus:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Unlink
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {primary ? (
            <PrimaryLinkView link={primary} linkTypeLabel={linkTypeLabel} />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-primary-900/70">
                This ticket is not linked to any scrum work item yet.
              </p>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Link to scrum item
                </Button>
              )}
            </div>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-700">{error}</p>
          )}
        </CardContent>
      </Card>

      <LinkWorkItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        ticketId={ticketId}
        linkTypes={linkTypes}
        excludeWorkItemIds={excludeWorkItemIds}
        defaultIsPrimary={!primary}
      />
    </>
  );
}

function PrimaryLinkView({
  link,
  linkTypeLabel,
}: {
  link: TicketLinkWithTarget;
  linkTypeLabel: string;
}) {
  const { target } = link;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
          {linkTypeLabel}
        </span>
        <Link
          href={`/projects/${target.project.key}`}
          className="font-mono text-sm font-semibold text-primary-900 hover:underline"
        >
          {target.item_key}
        </Link>
        <WorkItemTypeBadge type={target.type} />
        <WorkItemStatusBadge status={target.status} />
      </div>

      <p className="text-sm font-medium text-gray-900">{target.title}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Project">
          <Link
            href={`/projects/${target.project.key}`}
            className="text-sm text-gray-900 hover:underline"
          >
            {target.project.name}{" "}
            <span className="text-gray-500">({target.project.key})</span>
          </Link>
        </Field>

        <Field label="Sprint">
          {target.sprint ? (
            <span className="text-sm text-gray-900">
              {target.sprint.name}
              {target.sprint.status === "active" && (
                <span className="ml-1 text-xs text-emerald-700">(active)</span>
              )}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Backlog</span>
          )}
        </Field>

        {target.sprint?.end_date && (
          <Field label="Sprint ends">
            <span className="text-sm text-gray-900">
              {formatDate(target.sprint.end_date, "PP")}
            </span>
          </Field>
        )}

        <Field label="">
          <Link
            href={`/projects/${target.project.key}`}
            className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline"
          >
            View in project
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Field>
      </div>

      {link.note && (
        <div className="rounded border border-primary-200 bg-white/60 p-2 text-xs text-gray-700">
          {link.note}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <p className="text-xs font-medium text-gray-500">{label}</p>
      )}
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
