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
import { SupportLevel, SUPPORT_LEVEL_CONFIG } from "@/types/team.types";
import { ChevronDown } from "lucide-react";

interface SupportLevelDropdownProps {
  ticketId: string;
  level: SupportLevel;
  isSupportAgent: boolean;
  isClosed: boolean;
}

const levelOptions: SupportLevel[] = ["L1", "L2", "L3"];

export function SupportLevelDropdown({
  ticketId,
  level,
  isSupportAgent,
  isClosed,
}: SupportLevelDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLevelChange = async (newLevel: SupportLevel) => {
    if (newLevel === level || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { support_level: newLevel });
      router.refresh();
    } catch (error) {
      console.error("Failed to update support level:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSupportAgent || isClosed) {
    return <SupportLevelBadge level={level} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
          disabled={isUpdating}
        >
          <span className="inline-flex items-center gap-1">
            <SupportLevelBadge level={level} />
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {levelOptions.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => handleLevelChange(option)}
            className={option === level ? "bg-gray-100" : ""}
          >
            <span>{SUPPORT_LEVEL_CONFIG[option].label}</span>
            {option === level && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
