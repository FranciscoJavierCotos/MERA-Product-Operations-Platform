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
import type { TicketTemperatureRow } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { ChevronDown } from "lucide-react";

interface TemperatureBadgeDropdownProps {
  ticketId: string;
  currentTemperature: TicketTemperatureRow | null | undefined;
  temperatures: TicketTemperatureRow[];
  isAssignedUser: boolean;
  isClosed: boolean;
}

export function TemperatureBadgeDropdown({
  ticketId,
  currentTemperature,
  temperatures,
  isAssignedUser,
  isClosed,
}: TemperatureBadgeDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleTemperatureChange = async (selected: TicketTemperatureRow) => {
    if (selected.id === currentTemperature?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { temperature_id: selected.id });
      router.refresh();
    } catch (error) {
      console.error("Failed to update client temperature:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAssignedUser || isClosed) {
    return <span>{currentTemperature?.emoji ?? "—"}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-md"
          disabled={isUpdating}
        >
          <Badge
            className={`${currentTemperature?.color_class ?? ""} whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
          >
            <span>{currentTemperature?.emoji}</span>
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {temperatures.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleTemperatureChange(option)}
            className={currentTemperature?.id === option.id ? "bg-gray-100" : ""}
          >
            <span>{option.emoji}</span>
            {currentTemperature?.id === option.id && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
