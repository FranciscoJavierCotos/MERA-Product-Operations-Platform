"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, ArrowRightCircle } from "lucide-react";
import { WorkItemCard } from "./work-item-card";
import { WorkItemForm } from "./work-item-form";
import { WorkItemDetailDialog } from "./work-item-detail-dialog";
import { updateWorkItemAction } from "@/app/(dashboard)/projects/actions";
import type { Project } from "@/types/project.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import type { WorkItemWithRelations } from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";

interface Props {
  project: Project;
  initialItems: WorkItemWithRelations[];
  sprints: SprintWithCounts[];
  profiles: Profile[];
  priorities: TicketPriorityRow[];
}

export function BacklogClient({
  project, initialItems, sprints, profiles, priorities,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<string>("");
  const [detailItem, setDetailItem] = useState<WorkItemWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const moveToSprint = (itemId: string, sprintId: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await updateWorkItemAction(project.key, itemId, {
        sprint_id: sprintId,
      });
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Backlog</h2>
        <div className="flex items-center gap-2">
          {sprints.length > 0 && (
            <Select value={selectedSprint} onValueChange={setSelectedSprint}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Move selected to sprint…" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.status === "active" ? "(active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Backlog is empty. Add your first work item.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {initialItems.map((item) => (
            <li key={item.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 cursor-pointer" onClick={() => setDetailItem(item)}>
                <WorkItemCard item={item} />
              </div>
              {selectedSprint && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveToSprint(item.id, selectedSprint)}
                  disabled={isPending}
                  title="Move to selected sprint"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <WorkItemForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={project.id}
        projectKey={project.key}
        sprintId={null}
        sprints={sprints}
        profiles={profiles}
        priorities={priorities}
      />

      <WorkItemDetailDialog
        open={detailItem != null}
        onOpenChange={(o) => { if (!o) setDetailItem(null); }}
        projectKey={project.key}
        item={detailItem}
        profiles={profiles}
        priorities={priorities}
        sprints={sprints}
      />
    </div>
  );
}
