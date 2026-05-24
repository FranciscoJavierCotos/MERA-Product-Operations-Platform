"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupportLevelBadge } from "@/components/shared/support-level-badge";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import type { TicketSupportLevelRow } from "@/types/ticket.types";
import { ChevronDown } from "lucide-react";

interface SupportLevelDropdownProps {
  ticketId: string;
  currentLevel: TicketSupportLevelRow | null | undefined;
  supportLevels: TicketSupportLevelRow[];
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function SupportLevelDropdown({
  ticketId,
  currentLevel,
  supportLevels,
  isSupportAgent,
  isClosed,
}: SupportLevelDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLevelChange = async (selected: TicketSupportLevelRow) => {
    if (selected.id === currentLevel?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { support_level_id: selected.id });
      router.refresh();
    } catch (error) {
      console.error("Failed to update support level:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSupportAgent || isClosed) {
    return <SupportLevelBadge level={currentLevel} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-md"
          disabled={isUpdating}
        >
          <span className="inline-flex items-center gap-1">
            <SupportLevelBadge level={currentLevel} />
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {supportLevels.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleLevelChange(option)}
            className={option.id === currentLevel?.id ? "bg-gray-100" : ""}
          >
            <span>{option.label}</span>
            {option.id === currentLevel?.id && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
