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
import type { TicketStatusRow } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { ResolutionDialog } from "@/components/tickets/resolution-dialog";
import { ChevronDown } from "lucide-react";

interface StatusBadgeDropdownProps {
  ticketId: string;
  currentStatus: TicketStatusRow;
  statuses: TicketStatusRow[];
  isSupportAgent: boolean;
  isClosed: boolean;
  currentResolution?: string | null;
}

const isHtmlEmpty = (html: string | null | undefined) =>
  !html ||
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;

export function StatusBadgeDropdown({
  ticketId,
  currentStatus,
  statuses,
  isSupportAgent,
  isClosed,
  currentResolution,
}: StatusBadgeDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TicketStatusRow | null>(
    null,
  );

  const canChangeStatus = isSupportAgent || isClosed;

  const handleStatusChange = async (selected: TicketStatusRow) => {
    if (selected.id === currentStatus.id || isUpdating) return;

    if (selected.is_final && isHtmlEmpty(currentResolution)) {
      setPendingStatus(selected);
      return;
    }

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { status_id: selected.id });
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const variant = currentStatus.badge_variant as "default" | "secondary" | "destructive" | "outline";

  if (!canChangeStatus) {
    return (
      <Badge variant={variant} className="whitespace-nowrap">
        {currentStatus.label}
      </Badge>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-md"
            disabled={isUpdating}
          >
            <Badge
              variant={variant}
              className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              {currentStatus.label}
              <ChevronDown className="h-3 w-3" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {statuses.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleStatusChange(option)}
              className={currentStatus.id === option.id ? "bg-gray-100" : ""}
            >
              {option.label}
              {currentStatus.id === option.id && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ResolutionDialog
        open={pendingStatus !== null}
        onClose={() => setPendingStatus(null)}
        ticketId={ticketId}
        targetStatus={pendingStatus}
        initialResolution={currentResolution ?? ""}
      />
    </>
  );
}
