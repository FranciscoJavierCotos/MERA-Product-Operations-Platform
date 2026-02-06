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
import { TicketStatus } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { ChevronDown } from "lucide-react";

interface StatusBadgeDropdownProps {
  ticketId: string;
  status: TicketStatus;
  isSupportAgent: boolean;
  isClosed: boolean;
}

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  new: { label: "New", variant: "default" },
  pending_customer: { label: "Pending Customer Side", variant: "outline" },
  pending_internal: { label: "Pending Our Side", variant: "secondary" },
  escalated: { label: "Escalated", variant: "destructive" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
};

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "pending_customer", label: "Pending Customer Side" },
  { value: "pending_internal", label: "Pending Our Side" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function StatusBadgeDropdown({
  ticketId,
  status,
  isSupportAgent,
  isClosed,
}: StatusBadgeDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const config = statusConfig[status];

  const canChangeStatus = isSupportAgent || isClosed;

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (newStatus === status || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { status: newStatus });
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // If ticket is open, only support agents can change status.
  // If ticket is closed, anyone who can view it may reopen by selecting a new status.
  if (!canChangeStatus) {
    return (
      <Badge variant={config.variant} className="whitespace-nowrap">
        {config.label}
      </Badge>
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
            variant={config.variant}
            className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            {config.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className={status === option.value ? "bg-gray-100" : ""}
          >
            {option.label}
            {status === option.value && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
