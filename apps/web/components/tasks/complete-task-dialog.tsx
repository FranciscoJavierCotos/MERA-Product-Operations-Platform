"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
import { Task } from "@/types/task.types";
import {
  completeTaskSchema,
  CompleteTaskFormData,
} from "@/lib/validations/task.schema";
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

interface CompleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (taskId: string, timeSpentMinutes?: number) => void;
  isLoading?: boolean;
}

export function CompleteTaskDialog({
  task,
  open,
  onOpenChange,
  onComplete,
  isLoading,
}: CompleteTaskDialogProps) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  const hasTicket = !!task?.ticket_id;

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CompleteTaskFormData>({
    resolver: zodResolver(completeTaskSchema),
  });

  const calculateTotalMinutes = (): number | undefined => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const total = h * 60 + m;
    return total > 0 ? total : undefined;
  };

  const onSubmit = () => {
    if (!task) return;

    const totalMinutes = calculateTotalMinutes();

    // Validate max time (24 hours)
    if (totalMinutes && totalMinutes > 1440) {
      setError("time_spent_minutes", {
        message: "Time cannot exceed 24 hours",
      });
      return;
    }

    onComplete(task.id, totalMinutes);
    handleClose();
  };

  const handleSkip = () => {
    if (!task) return;
    onComplete(task.id, undefined);
    handleClose();
  };

  const handleClose = () => {
    reset();
    setHours("");
    setMinutes("");
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Complete Task
          </DialogTitle>
          <DialogDescription>
            {hasTicket
              ? "Track time spent on this task. This will be added to the ticket's total time worked."
              : "Optionally track how much time you spent on this task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              &quot;{task.title}&quot;
            </p>

            <Label htmlFor="time">Time Spent</Label>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                  className="w-16"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  className="w-16"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-500">min</span>
              </div>
            </div>
            {errors.time_spent_minutes && (
              <p className="mt-1 text-sm text-red-600">
                {errors.time_spent_minutes.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Skip
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Completing..." : "Complete with Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
