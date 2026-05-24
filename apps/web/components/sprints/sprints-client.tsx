"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, CheckCircle2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { SprintStatusBadge } from "./sprint-status-badge";
import { SprintForm } from "./sprint-form";
import { SprintEditDialog } from "./sprint-edit-dialog";
import { WorkItemCard } from "@/components/work-items/work-item-card";
import { WorkItemForm } from "@/components/work-items/work-item-form";
import { WorkItemDetailDialog } from "@/components/work-items/work-item-detail-dialog";
import { WorkItemStatusBadge } from "@/components/work-items/work-item-status-badge";
import {
  startSprintAction,
  completeSprintAction,
} from "@/app/(dashboard)/projects/actions";
import type { Project } from "@/types/project.types";
import type { SprintWithCounts } from "@/types/sprint.types";
import type { WorkItemWithRelations } from "@/types/work-item.types";
import type { Profile } from "@/types/user.types";
import type { TicketPriorityRow } from "@/types/ticket.types";

interface Props {
  project: Project;
  initialSprints: SprintWithCounts[];
  /** Map of sprint_id → items in that sprint. */
  sprintItems: Record<string, WorkItemWithRelations[]>;
  profiles: Profile[];
  priorities: TicketPriorityRow[];
}

export function SprintsClient({
  project,
  initialSprints,
  sprintItems,
  profiles,
  priorities,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Which sprint cards are expanded (showing items).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // "Add item" form open for which sprint.
  const [addItemSprint, setAddItemSprint] = useState<string | null>(null);
  // Detail dialog state.
  const [detailItem, setDetailItem] = useState<WorkItemWithRelations | null>(null);
  // Sprint being edited.
  const [editSprint, setEditSprint] = useState<SprintWithCounts | null>(null);

  // Non-completed sprints passed to the child dialogs for sprint selection.
  const nonCompletedSprints = initialSprints.filter((s) => s.status !== "completed");

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const onStart = (id: string) => {
    startTransition(async () => {
      const result = await startSprintAction(project.key, id);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  };

  const onComplete = (id: string) => {
    if (!confirm("Complete sprint? Unfinished items return to the backlog.")) return;
    startTransition(async () => {
      const result = await completeSprintAction(project.key, id);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Sprints</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New sprint
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialSprints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No sprints yet.
        </div>
      ) : (
        <div className="space-y-3">
          {initialSprints.map((sprint) => {
            const progress = sprint.total_items === 0
              ? 0
              : Math.round((sprint.done_items / sprint.total_items) * 100);
            const isExpanded = !!expanded[sprint.id];
            const items = sprintItems[sprint.id] ?? [];

            return (
              <Card key={sprint.id}>
                {/* ── Header ── */}
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Expand / collapse toggle */}
                    <button
                      type="button"
                      className="mt-0.5 text-gray-400 hover:text-gray-700 flex-shrink-0"
                      onClick={() => toggleExpanded(sprint.id)}
                      aria-label={isExpanded ? "Collapse sprint" : "Expand sprint"}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </button>

                    <div
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(sprint.id)}
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{sprint.name}</CardTitle>
                        <SprintStatusBadge status={sprint.status} />
                      </div>
                      {sprint.goal && (
                        <p className="text-sm text-gray-500 mt-1">{sprint.goal}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {sprint.status === "planned" && (
                      <Button size="sm" onClick={() => onStart(sprint.id)} disabled={isPending}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Start
                      </Button>
                    )}
                    {sprint.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => onComplete(sprint.id)} disabled={isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                      </Button>
                    )}
                    {sprint.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setAddItemSprint(sprint.id); }}
                        title="Add item to this sprint"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditSprint(sprint)}
                      title="Edit sprint"
                      aria-label="Edit sprint"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                {/* ── Stats bar ── */}
                <CardContent className="pt-0 pb-3 text-xs text-gray-500 flex justify-between">
                  <span>
                    {sprint.start_date && `${sprint.start_date}`}
                    {sprint.start_date && sprint.end_date && " → "}
                    {sprint.end_date && `${sprint.end_date}`}
                  </span>
                  <span>
                    {sprint.done_items} / {sprint.total_items} done ({progress}%)
                  </span>
                </CardContent>

                {/* ── Items list (expanded) ── */}
                {isExpanded && (
                  <div className="border-t">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No items in this sprint.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setDetailItem(item)}
                          >
                            {/* Status badge */}
                            <div className="flex-shrink-0">
                              <WorkItemStatusBadge status={item.status} />
                            </div>

                            {/* Key + title */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                                  {item.item_key}
                                </span>
                                <span className="text-sm text-gray-900 truncate">
                                  {item.title}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {/* Right-side meta */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.priority && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.priority.color_class}`}>
                                  {item.priority.label}
                                </span>
                              )}
                              {item.story_points != null && (
                                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                                  {item.story_points}
                                </span>
                              )}
                              {item.assignee && (
                                <span className="text-xs text-gray-500">{item.assignee.full_name}</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* New sprint form */}
      <SprintForm
        open={open}
        onOpenChange={setOpen}
        projectId={project.id}
        projectKey={project.key}
        sprintDurationWeeks={project.sprint_duration_weeks ?? 2}
        existingSprints={initialSprints.map((s) => ({
          id: s.id,
          name: s.name,
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
        }))}
      />

      {/* Add item to a specific sprint */}
      <WorkItemForm
        open={addItemSprint != null}
        onOpenChange={(o) => { if (!o) setAddItemSprint(null); }}
        projectId={project.id}
        projectKey={project.key}
        sprintId={addItemSprint}
        sprints={nonCompletedSprints}
        profiles={profiles}
        priorities={priorities}
      />

      {/* Item detail / edit dialog */}
      <WorkItemDetailDialog
        open={detailItem != null}
        onOpenChange={(o) => { if (!o) setDetailItem(null); }}
        projectKey={project.key}
        item={detailItem}
        profiles={profiles}
        priorities={priorities}
        sprints={nonCompletedSprints}
      />

      {/* Sprint edit / delete dialog */}
      {editSprint && (
        <SprintEditDialog
          open={editSprint != null}
          onOpenChange={(o) => { if (!o) setEditSprint(null); }}
          projectKey={project.key}
          sprint={editSprint}
          sprintDurationWeeks={project.sprint_duration_weeks ?? 2}
          allSprints={initialSprints}
        />
      )}
    </div>
  );
}
