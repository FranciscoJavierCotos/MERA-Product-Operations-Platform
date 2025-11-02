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
import { TicketPriority } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { ChevronDown } from "lucide-react";

interface PriorityBadgeDropdownProps {
  ticketId: string;
  priority: TicketPriority;
  isSupportAgent: boolean;
  isClosed: boolean;
}

const priorityConfig: Record<
  TicketPriority,
  {
    label: string;
    className: string;
  }
> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

const priorityOptions: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function PriorityBadgeDropdown({
  ticketId,
  priority,
  isSupportAgent,
  isClosed,
}: PriorityBadgeDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const config = priorityConfig[priority];

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (newPriority === priority || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { priority: newPriority });
      router.refresh();
    } catch (error) {
      console.error("Failed to update priority:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // If not a support agent or ticket is closed, show non-interactive badge
  if (!isSupportAgent || isClosed) {
    return <Badge className={config.className}>{config.label}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
          disabled={isUpdating}
        >
          <Badge
            className={`${config.className} whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
          >
            {config.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {priorityOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handlePriorityChange(option.value)}
            className={priority === option.value ? "bg-gray-100" : ""}
          >
            {option.label}
            {priority === option.value && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
