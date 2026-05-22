"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkItemTypeBadge } from "@/components/work-items/work-item-type-badge";
import { WorkItemStatusBadge } from "@/components/work-items/work-item-status-badge";
import { createClient } from "@/lib/supabase/client";
import {
  createItemLink,
  listLinkableProjects,
  searchLinkableWorkItems,
} from "@/lib/supabase/queries/item-links";
import type {
  LinkTypeId,
  LinkTypeRow,
} from "@/types/item-link.types";
import type { WorkItemStatus, WorkItemType } from "@/types/work-item.types";

type SearchResult = {
  id: string;
  item_key: string;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  project: { id: string; key: string; name: string };
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** When linking from a ticket. Exactly one of ticketId or sourceWorkItemId must be set. */
  ticketId?: string;
  /** When linking from another work item (reverse use, e.g. inside work item dialog). */
  sourceWorkItemId?: string;
  linkTypes: LinkTypeRow[];
  excludeWorkItemIds: string[];
  defaultIsPrimary?: boolean;
}

const NO_PROJECT = "__all__";

export function LinkWorkItemDialog({
  open,
  onClose,
  ticketId,
  sourceWorkItemId,
  linkTypes,
  excludeWorkItemIds,
  defaultIsPrimary = true,
}: Props) {
  const router = useRouter();
  const [linkType, setLinkType] = useState<LinkTypeId>("implements");
  const [projectId, setProjectId] = useState<string>(NO_PROJECT);
  const [projects, setProjects] = useState<
    Array<{ id: string; key: string; name: string }>
  >([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [makePrimary, setMakePrimary] = useState(defaultIsPrimary);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter to "primary-eligible" types — only directional outgoing links make
  // sense as a primary. Inverse-direction labels stay available, but we put
  // the more useful ones at the top.
  const sortedLinkTypes = useMemo(
    () => [...linkTypes].sort((a, b) => a.sort_order - b.sort_order),
    [linkTypes],
  );

  useEffect(() => {
    if (!open) return;
    setLinkType("implements");
    setProjectId(NO_PROJECT);
    setQuery("");
    setResults([]);
    setSelected(null);
    setMakePrimary(defaultIsPrimary);
    setNote("");
    setError(null);
  }, [open, defaultIsPrimary]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    listLinkableProjects(supabase).then(setProjects).catch(() => setProjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const rows = await searchLinkableWorkItems(supabase, {
          query,
          projectId: projectId === NO_PROJECT ? null : projectId,
          excludeIds: excludeWorkItemIds,
          limit: 25,
        });
        setResults(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, projectId, open, excludeWorkItemIds]);

  // When type changes to "implements" and no primary exists yet, recommend primary.
  useEffect(() => {
    if (linkType === "implements" && defaultIsPrimary) {
      setMakePrimary(true);
    }
  }, [linkType, defaultIsPrimary]);

  const submit = async () => {
    if (!selected) {
      setError("Pick a work item to link");
      return;
    }
    if (!ticketId && !sourceWorkItemId) {
      setError("Missing source");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      await createItemLink(supabase, {
        source_ticket_id: ticketId ?? null,
        source_work_item_id: sourceWorkItemId ?? null,
        target_work_item_id: selected.id,
        link_type: linkType,
        is_primary: ticketId ? makePrimary : false,
        note: note.trim() ? note.trim() : null,
        created_by: userRes.user?.id ?? null,
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link to scrum item</DialogTitle>
          <DialogDescription>
            Connect this {ticketId ? "ticket" : "work item"} to an epic, story,
            task, or bug — the link shows in the details panel and on the work
            item too.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-gray-600">Link type</Label>
              <Select
                value={linkType}
                onValueChange={(v) => setLinkType(v as LinkTypeId)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedLinkTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>Any project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-600">
              Search by key or title
            </Label>
            <Input
              autoFocus
              placeholder="e.g. PROJ-12 or login flow"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
            {loading ? (
              <p className="p-3 text-sm text-gray-500">Searching…</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">
                {query
                  ? "No matching work items."
                  : "Start typing to search work items, or pick a project to browse."}
              </p>
            ) : (
              <ul>
                {results.map((r) => {
                  const isSelected = selected?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          isSelected ? "bg-indigo-50" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-gray-900">
                              {r.item_key}
                            </span>
                            <WorkItemTypeBadge type={r.type} />
                            <WorkItemStatusBadge status={r.status} />
                          </div>
                          <p className="truncate text-sm text-gray-800">
                            {r.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.project.name} ({r.project.key})
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-medium text-indigo-700">
                            Selected
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {ticketId && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={makePrimary}
                onChange={(e) => setMakePrimary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>
                Make this the primary link
                <span className="ml-1 text-xs text-gray-500">
                  (shown in the details panel)
                </span>
              </span>
            </label>
          )}

          <div>
            <Label className="text-xs text-gray-600">Note (optional)</Label>
            <Textarea
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this link matters…"
              className="mt-1"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !selected}
          >
            {submitting ? "Linking…" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
