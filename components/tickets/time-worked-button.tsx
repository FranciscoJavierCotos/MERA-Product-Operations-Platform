"use client";

import { useState } from "react";
import { TimeWorkedDialog } from "@/components/tickets/time-worked-dialog";
import { formatTimeWorked } from "@/lib/utils/date";
import { Clock } from "lucide-react";

interface TimeWorkedButtonProps {
  ticketId: string;
  timeWorkedMinutes: number;
  isClosed: boolean;
}

export function TimeWorkedButton({
  ticketId,
  timeWorkedMinutes,
  isClosed,
}: TimeWorkedButtonProps) {
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsTimeDialogOpen(true)}
        disabled={isClosed}
        className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Clock className="h-5 w-5" />
        {formatTimeWorked(timeWorkedMinutes)}
      </button>
      <p className="text-sm text-gray-500 mt-1">Click to add or remove time</p>

      <TimeWorkedDialog
        ticketId={ticketId}
        currentMinutes={timeWorkedMinutes}
        open={isTimeDialogOpen}
        onOpenChange={setIsTimeDialogOpen}
      />
    </>
  );
}
