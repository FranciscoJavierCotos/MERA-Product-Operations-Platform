"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { createWorkItemAction } from "@/app/(dashboard)/projects/actions";
import { WORK_ITEM_TYPES, WORK_ITEM_TYPE_LABELS } from "@/types/work-item.types";
import type { WorkItemType } from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";
import type { SprintWithCounts } from "@/types/sprint.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectKey: string;
  /** Pre-selected sprint; user can override via the sprint selector. */
  sprintId?: string | null;
  /** Non-completed sprints available for selection. If empty, no sprint field is shown. */
  sprints?: SprintWithCounts[];
  profiles: Profile[];
  priorities: TicketPriorityRow[];
}

const NO_ASSIGNEE = "__none__";
const NO_PRIORITY = "__none__";
const NO_SPRINT   = "__none__";

export function WorkItemForm({
  open, onOpenChange,
  projectId, projectKey,
  sprintId, sprints = [],
  profiles, priorities,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkItemType>("story");
  const [priorityId, setPriorityId] = useState<string>(NO_PRIORITY);
  const [assignedTo, setAssignedTo] = useState<string>(NO_ASSIGNEE);
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [selectedSprintId, setSelectedSprintId] = useState<string>(sprintId ?? NO_SPRINT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle(""); setDescription(""); setType("story");
    setPriorityId(NO_PRIORITY); setAssignedTo(NO_ASSIGNEE);
    setStoryPoints(""); setError(null);
    setSelectedSprintId(sprintId ?? NO_SPRINT);
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createWorkItemAction(projectKey, {
        project_id: projectId,
        sprint_id: selectedSprintId === NO_SPRINT ? null : selectedSprintId,
        type,
        title,
        description: description || null,
        priority_id: priorityId === NO_PRIORITY ? null : Number(priorityId),
        assigned_to: assignedTo === NO_ASSIGNEE ? null : assignedTo,
        story_points: storyPoints === "" ? null : Number(storyPoints),
      });
      if (!result.ok) { setError(result.error); return; }
      reset();
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New work item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as WorkItemType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_ITEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{WORK_ITEM_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PRIORITY}>— None —</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="wi-title">Title *</Label>
            <Input id="wi-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>

          <div>
            <Label htmlFor="wi-desc">Description</Label>
            <Textarea id="wi-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wi-sp">Story points</Label>
              <Input
                id="wi-sp"
                type="number"
                min={0}
                max={100}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
            </div>
          </div>

          {/* Sprint selector — only shown when sprints are available */}
          {sprints.length > 0 && (
            <div>
              <Label>Sprint</Label>
              <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                <SelectTrigger><SelectValue placeholder="Backlog (no sprint)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SPRINT}>Backlog (no sprint)</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.status === "active" ? " (active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isPending || !title.trim()}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
