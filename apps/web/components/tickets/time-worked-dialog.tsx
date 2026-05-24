"use client";

import { useState } from "react";
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
import { updateTimeWorked } from "@/lib/supabase/queries/tickets";
import { createClient } from "@/lib/supabase/client";
import { formatTimeWorked } from "@/lib/utils/date";

interface TimeWorkedDialogProps {
  ticketId: string;
  currentMinutes: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeWorkedDialog({
  ticketId,
  currentMinutes,
  open,
  onOpenChange,
}: TimeWorkedDialogProps) {
  const router = useRouter();
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const additionalMinutes = days * 24 * 60 + hours * 60 + minutes;

      if (additionalMinutes <= 0) {
        setError("Please enter a valid time amount");
        setIsLoading(false);
        return;
      }

      const newTotal = currentMinutes + additionalMinutes;
      const supabase = createClient();
      await updateTimeWorked(supabase, ticketId, newTotal);

      // Reset form
      setDays(0);
      setHours(0);
      setMinutes(0);

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add time");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubtract = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const subtractMinutes = days * 24 * 60 + hours * 60 + minutes;

      if (subtractMinutes <= 0) {
        setError("Please enter a valid time amount");
        setIsLoading(false);
        return;
      }

      const newTotal = Math.max(0, currentMinutes - subtractMinutes);
      const supabase = createClient();
      await updateTimeWorked(supabase, ticketId, newTotal);

      // Reset form
      setDays(0);
      setHours(0);
      setMinutes(0);

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subtract time");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      await updateTimeWorked(supabase, ticketId, 0);

      // Reset form
      setDays(0);
      setHours(0);
      setMinutes(0);

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset time");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Time Worked</DialogTitle>
          <DialogDescription>
            Current total: <strong>{formatTimeWorked(currentMinutes)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="days">Days</Label>
              <Input
                id="days"
                type="number"
                min="0"
                value={days}
                onChange={(e) =>
                  setDays(Math.max(0, parseInt(e.target.value) || 0))
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) =>
                  setHours(
                    Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                  )
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  setMinutes(
                    Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  )
                }
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading || currentMinutes === 0}
            className="w-full sm:w-auto"
          >
            Reset to 0
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="destructive"
              onClick={handleSubtract}
              disabled={isLoading || currentMinutes === 0}
              className="flex-1 sm:flex-none"
            >
              Subtract
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Add
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
