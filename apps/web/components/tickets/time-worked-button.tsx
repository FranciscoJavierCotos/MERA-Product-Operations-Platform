"use client";

import { useState } from "react";
import { TimeWorkedDialog } from "@/components/tickets/time-worked-dialog";
import { formatTimeWorked } from "@/lib/utils/date";

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
        className="text-sm text-gray-900 hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {formatTimeWorked(timeWorkedMinutes)}
      </button>

      <TimeWorkedDialog
        ticketId={ticketId}
        currentMinutes={timeWorkedMinutes}
        open={isTimeDialogOpen}
        onOpenChange={setIsTimeDialogOpen}
      />
    </>
  );
}
