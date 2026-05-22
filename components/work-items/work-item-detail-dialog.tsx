"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/shared/user-avatar";
import { WorkItemTypeBadge } from "./work-item-type-badge";
import { WorkItemStatusBadge } from "./work-item-status-badge";
import {
  WORK_ITEM_STATUSES, WORK_ITEM_STATUS_LABELS,
  WORK_ITEM_TYPES, WORK_ITEM_TYPE_LABELS,
} from "@/types/work-item.types";
import type {
  WorkItemWithRelations, WorkItemStatus, WorkItemType,
} from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import {
  updateWorkItemAction,
  createWorkItemCommentAction,
} from "@/app/(dashboard)/projects/actions";
import { createClient } from "@/lib/supabase/client";
import { listWorkItemComments } from "@/lib/supabase/queries/work-item-comments";
import type { WorkItemComment } from "@/types/work-item.types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  item: WorkItemWithRelations | null;
  profiles: Profile[];
  priorities: TicketPriorityRow[];
  /** Non-completed sprints for the sprint selector. If empty, sprint field is hidden. */
  sprints?: SprintWithCounts[];
}

const NO_ASSIGNEE = "__none__";
const NO_PRIORITY = "__none__";
const NO_SPRINT   = "__none__";

export function WorkItemDetailDialog({
  open, onOpenChange,
  projectKey, item,
  profiles, priorities,
  sprints = [],
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<WorkItemStatus>("todo");
  const [type, setType] = useState<WorkItemType>("story");
  const [priorityId, setPriorityId] = useState<string>(NO_PRIORITY);
  const [assignedTo, setAssignedTo] = useState<string>(NO_ASSIGNEE);
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>(NO_SPRINT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [comments, setComments] = useState<WorkItemComment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description ?? "");
    setStatus(item.status);
    setType(item.type);
    setPriorityId(item.priority_id != null ? String(item.priority_id) : NO_PRIORITY);
    setAssignedTo(item.assigned_to ?? NO_ASSIGNEE);
    setStoryPoints(item.story_points != null ? String(item.story_points) : "");
    setSprintId(item.sprint_id ?? NO_SPRINT);
    setEditing(false);
    setError(null);
  }, [item?.id]);

  useEffect(() => {
    if (!item || !open) return;
    const supabase = createClient();
    listWorkItemComments(supabase, item.id).then(setComments).catch(() => setComments([]));
  }, [item?.id, open]);

  /**
   * "Never previous": only show sprints that are at or after the item's
   * current sprint in creation order, so you can't move an item backwards.
   * If the item is in backlog (no sprint), all non-completed sprints are shown.
   */
  const availableSprints = useMemo(() => {
    if (!item?.sprint_id) return sprints;
    const sorted = [...sprints].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const idx = sorted.findIndex((s) => s.id === item.sprint_id);
    return idx >= 0 ? sorted.slice(idx) : sorted;
  }, [sprints, item?.sprint_id]);

  // Display name of the item's current sprint (for view mode).
  const currentSprintName = useMemo(() => {
    if (!item?.sprint_id) return null;
    return sprints.find((s) => s.id === item.sprint_id)?.name ?? "Unknown sprint";
  }, [sprints, item?.sprint_id]);

  if (!item) return null;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateWorkItemAction(projectKey, item.id, {
        title,
        description: description || null,
        status,
        type,
        priority_id: priorityId === NO_PRIORITY ? null : Number(priorityId),
        assigned_to: assignedTo === NO_ASSIGNEE ? null : assignedTo,
        story_points: storyPoints === "" ? null : Number(storyPoints),
        sprint_id: sprintId === NO_SPRINT ? null : sprintId,
      });
      if (!result.ok) { setError(result.error); return; }
      setEditing(false);
      router.refresh();
    });
  };

  const submitComment = () => {
    if (!newComment.trim()) return;
    startTransition(async () => {
      const result = await createWorkItemCommentAction(projectKey, {
        work_item_id: item.id,
        content: newComment.trim(),
      });
      if (!result.ok) { setError(result.error); return; }
      setNewComment("");
      const supabase = createClient();
      const updated = await listWorkItemComments(supabase, item.id);
      setComments(updated);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{item.item_key}</span>
            <WorkItemTypeBadge type={item.type} />
            <WorkItemStatusBadge status={item.status} />
          </div>
          <DialogTitle className="text-base">
            {editing ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            ) : (
              item.title
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div>
              <Label className="text-xs text-gray-500">Description</Label>
              {editing ? (
                <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[2rem]">
                  {item.description || <span className="text-gray-400">No description</span>}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs text-gray-500">Comments ({comments.length})</Label>
              <div className="space-y-3 mt-2">
                <Textarea
                  rows={2}
                  placeholder="Write a comment…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={submitComment} disabled={isPending || !newComment.trim()}>
                    Comment
                  </Button>
                </div>
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2 border-t pt-3">
                    <UserAvatar
                      name={c.user?.full_name ?? "Unknown"}
                      avatarUrl={c.user?.avatar_url}
                      className="h-7 w-7"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium text-gray-900">{c.user?.full_name ?? "Unknown"}</span>
                        {" • "}
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </div>
                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-1 space-y-3 text-sm">
            <Field label="Status">
              {editing ? (
                <Select value={status} onValueChange={(v) => setStatus(v as WorkItemStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORK_ITEM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{WORK_ITEM_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <WorkItemStatusBadge status={item.status} />
              )}
            </Field>

            <Field label="Type">
              {editing ? (
                <Select value={type} onValueChange={(v) => setType(v as WorkItemType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORK_ITEM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{WORK_ITEM_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <WorkItemTypeBadge type={item.type} />
              )}
            </Field>

            <Field label="Priority">
              {editing ? (
                <Select value={priorityId} onValueChange={setPriorityId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PRIORITY}>— None —</SelectItem>
                    {priorities.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : item.priority ? (
                <span className={`inline-block px-2 py-0.5 rounded ${item.priority.color_class}`}>
                  {item.priority.label}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </Field>

            <Field label="Assignee">
              {editing ? (
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : item.assignee ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={item.assignee.full_name} avatarUrl={item.assignee.avatar_url} className="h-6 w-6" />
                  <span>{item.assignee.full_name}</span>
                </div>
              ) : (
                <span className="text-gray-400">Unassigned</span>
              )}
            </Field>

            <Field label="Story points">
              {editing ? (
                <Input type="number" min={0} max={100} value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} />
              ) : (
                <span>{item.story_points ?? <span className="text-gray-400">—</span>}</span>
              )}
            </Field>

            {/* Sprint field — only rendered when sprints data is provided */}
            {sprints.length > 0 && (
              <Field label="Sprint">
                {editing ? (
                  <Select value={sprintId} onValueChange={setSprintId}>
                    <SelectTrigger><SelectValue placeholder="Backlog" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SPRINT}>Backlog (no sprint)</SelectItem>
                      {availableSprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.status === "active" ? " (active)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={currentSprintName ? "text-gray-900" : "text-gray-400"}>
                    {currentSprintName ?? "Backlog"}
                  </span>
                )}
              </Field>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="pt-2 flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={isPending}>Cancel</Button>
                  <Button size="sm" onClick={save} disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
