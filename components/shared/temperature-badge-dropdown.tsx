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
import { ClientTemperature } from "@/types/ticket.types";
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import { ChevronDown } from "lucide-react";

interface TemperatureBadgeDropdownProps {
  ticketId: string;
  temperature: ClientTemperature;
  isAssignedUser: boolean;
  isClosed: boolean;
}

const temperatureConfig: Record<
  ClientTemperature,
  {
    label: string;
    emoji: string;
    className: string;
  }
> = {
  hot: {
    label: "Hot",
    emoji: "🔴",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  warm: {
    label: "Warm",
    emoji: "🟡",
    className:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
  cool: {
    label: "Good",
    emoji: "🟢",
    className:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
};

const temperatureOptions: {
  value: ClientTemperature;
  label: string;
  emoji: string;
}[] = [
  { value: "cool", label: "Good", emoji: "🟢" },
  { value: "warm", label: "Warm", emoji: "🟡" },
  { value: "hot", label: "Hot", emoji: "🔴" },
];

export function TemperatureBadgeDropdown({
  ticketId,
  temperature,
  isAssignedUser,
  isClosed,
}: TemperatureBadgeDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const config = temperatureConfig[temperature];

  const handleTemperatureChange = async (newTemperature: ClientTemperature) => {
    if (newTemperature === temperature || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, {
        client_temperature: newTemperature,
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update client temperature:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // If not assigned user or ticket is closed, show non-interactive badge
  if (!isAssignedUser || isClosed) {
    return (
      <Badge className={config.className}>
        <span className="mr-1">{config.emoji}</span>
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
            className={`${config.className} whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
          >
            <span>{config.emoji}</span>
            {config.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {temperatureOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleTemperatureChange(option.value)}
            className={temperature === option.value ? "bg-gray-100" : ""}
          >
            <span className="mr-2">{option.emoji}</span>
            {option.label}
            {temperature === option.value && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
