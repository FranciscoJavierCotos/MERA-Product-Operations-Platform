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
  SprintWeekPicker,
  formatDateISO,
  type SprintDateRange,
  type ExistingSprintSlot,
} from "./sprint-week-picker";
import { createSprintAction } from "@/app/(dashboard)/projects/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectKey: string;
  /** Sprint length (weeks) configured on the project. */
  sprintDurationWeeks?: number;
  /** Already-scheduled sprints shown as occupied ranges on the calendar. */
  existingSprints?: ExistingSprintSlot[];
}

export function SprintForm({
  open,
  onOpenChange,
  projectId,
  projectKey,
  sprintDurationWeeks = 2,
  existingSprints = [],
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [dateRange, setDateRange] = useState<SprintDateRange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setGoal("");
    setDateRange(null);
    setError(null);
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createSprintAction(projectKey, {
        project_id: projectId,
        name,
        goal: goal || null,
        start_date: dateRange ? formatDateISO(dateRange.start) : null,
        end_date: dateRange ? formatDateISO(dateRange.end) : null,
      });
      if (!result.ok) { setError(result.error); return; }
      reset();
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New sprint</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="sp-name">Name *</Label>
            <Input
              id="sp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 1"
            />
          </div>

          <div>
            <Label htmlFor="sp-goal">Goal</Label>
            <Textarea
              id="sp-goal"
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-1 block">
              Sprint dates
              <span className="ml-1.5 font-normal text-gray-400 text-xs">
                — click any free day to auto-select {sprintDurationWeeks} week
                {sprintDurationWeeks !== 1 ? "s" : ""}
              </span>
            </Label>
            <SprintWeekPicker
              sprintDurationWeeks={sprintDurationWeeks}
              value={dateRange}
              onChange={setDateRange}
              onClear={() => setDateRange(null)}
              existingSprints={existingSprints}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
