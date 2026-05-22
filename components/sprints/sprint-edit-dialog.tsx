"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SprintWeekPicker,
  formatDateISO,
  type SprintDateRange,
  type ExistingSprintSlot,
} from "./sprint-week-picker";
import {
  updateSprintAction,
  deleteSprintAction,
} from "@/app/(dashboard)/projects/actions";
import type { SprintWithCounts } from "@/types/sprint.types";

// ── helpers ─────────────────────────────────────────────────────────────────

/** Parse an ISO "yyyy-MM-dd" string into a local Date (avoids UTC midnight shift). */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ── props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  sprint: SprintWithCounts;
  sprintDurationWeeks: number;
  /** All sprints in the project — the edited one is excluded from the picker's blocked-day overlay. */
  allSprints: SprintWithCounts[];
}

// ── component ────────────────────────────────────────────────────────────────

type View = "edit" | "confirm-delete";

export function SprintEditDialog({
  open,
  onOpenChange,
  projectKey,
  sprint,
  sprintDurationWeeks,
  allSprints,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("edit");
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? "");
  const [dateRange, setDateRange] = useState<SprintDateRange | null>(() =>
    sprint.start_date && sprint.end_date
      ? {
          start: parseLocalDate(sprint.start_date),
          end: parseLocalDate(sprint.end_date),
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-sync fields whenever the dialog opens for a (possibly different) sprint.
  useEffect(() => {
    if (open) {
      setView("edit");
      setName(sprint.name);
      setGoal(sprint.goal ?? "");
      setDateRange(
        sprint.start_date && sprint.end_date
          ? {
              start: parseLocalDate(sprint.start_date),
              end: parseLocalDate(sprint.end_date),
            }
          : null,
      );
      setError(null);
    }
  }, [open, sprint]);

  const close = () => onOpenChange(false);

  // Slots passed to the picker — exclude the sprint being edited so its own
  // occupied range doesn't block itself.
  const otherSprints: ExistingSprintSlot[] = allSprints
    .filter((s) => s.id !== sprint.id)
    .map((s) => ({
      id: s.id,
      name: s.name,
      start_date: s.start_date,
      end_date: s.end_date,
      status: s.status,
    }));

  // ── Save handler ────────────────────────────────────────────────────────────

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSprintAction(projectKey, sprint.id, {
        name,
        goal: goal || null,
        start_date: dateRange ? formatDateISO(dateRange.start) : null,
        end_date: dateRange ? formatDateISO(dateRange.end) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  };

  // ── Delete handler ──────────────────────────────────────────────────────────

  const onDeleteConfirm = () => {
    startTransition(async () => {
      const result = await deleteSprintAction(projectKey, sprint.id);
      if (!result.ok) {
        setError(result.error);
        setView("edit");
        return;
      }
      close();
      router.refresh();
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md">
        {/* ── Edit view ── */}
        {view === "edit" && (
          <>
            <DialogHeader>
              <DialogTitle>Edit sprint</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="sp-edit-name">Name *</Label>
                <Input
                  id="sp-edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sprint 1"
                />
              </div>

              <div>
                <Label htmlFor="sp-edit-goal">Goal</Label>
                <Textarea
                  id="sp-edit-goal"
                  rows={2}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1 block">
                  Sprint dates
                  <span className="ml-1.5 font-normal text-gray-400 text-xs">
                    — click any free day to auto-select {sprintDurationWeeks}&nbsp;week
                    {sprintDurationWeeks !== 1 ? "s" : ""}
                  </span>
                </Label>
                <SprintWeekPicker
                  sprintDurationWeeks={sprintDurationWeeks}
                  value={dateRange}
                  onChange={setDateRange}
                  onClear={() => setDateRange(null)}
                  existingSprints={otherSprints}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
              {/* Delete button on the left */}
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 sm:mr-auto"
                onClick={() => setView("confirm-delete")}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete sprint
              </Button>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={close} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isPending || !name.trim()}
                >
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {/* ── Delete confirmation view ── */}
        {view === "confirm-delete" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete sprint?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <p className="text-sm text-gray-700">
                You are about to permanently delete{" "}
                <span className="font-semibold">{sprint.name}</span>.
              </p>
              {sprint.total_items > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {sprint.total_items} work item
                  {sprint.total_items !== 1 ? "s" : ""} in this sprint will be
                  moved back to the backlog.
                </p>
              )}
              <p className="text-sm text-gray-500">This action cannot be undone.</p>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => { setView("edit"); setError(null); }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onDeleteConfirm}
                disabled={isPending}
              >
                {isPending ? "Deleting…" : "Delete sprint"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
