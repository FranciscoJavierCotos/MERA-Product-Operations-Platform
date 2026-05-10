"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TicketPriorityRow } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { ChevronDown } from "lucide-react";

interface PriorityBadgeDropdownProps {
  ticketId: string;
  currentPriority: TicketPriorityRow;
  priorities: TicketPriorityRow[];
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function PriorityBadgeDropdown({
  ticketId,
  currentPriority,
  priorities,
  isSupportAgent,
  isClosed,
}: PriorityBadgeDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePriorityChange = async (selected: TicketPriorityRow) => {
    if (selected.id === currentPriority.id || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { priority_id: selected.id });
      router.refresh();
    } catch (error) {
      console.error("Failed to update priority:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSupportAgent || isClosed) {
    return (
      <Badge className={currentPriority.color_class}>{currentPriority.label}</Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
          disabled={isUpdating}
        >
          <Badge
            className={`${currentPriority.color_class} whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
          >
            {currentPriority.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {priorities.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handlePriorityChange(option)}
            className={currentPriority.id === option.id ? "bg-gray-100" : ""}
          >
            {option.label}
            {currentPriority.id === option.id && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
