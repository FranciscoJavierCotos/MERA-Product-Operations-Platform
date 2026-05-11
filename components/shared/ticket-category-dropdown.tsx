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
import { createClient } from "@/lib/supabase/client";
import { updateTicket } from "@/lib/supabase/queries/tickets";
import type { TicketCategoryRow } from "@/types/ticket.types";
import { ChevronDown } from "lucide-react";

interface TicketCategoryDropdownProps {
  ticketId: string;
  currentCategory: TicketCategoryRow | null | undefined;
  categories: TicketCategoryRow[];
  isSupportAgent: boolean;
  isClosed: boolean;
}

export function TicketCategoryDropdown({
  ticketId,
  currentCategory,
  categories,
  isSupportAgent,
  isClosed,
}: TicketCategoryDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (selected: TicketCategoryRow) => {
    if (isUpdating) return;
    if (selected.id === currentCategory?.id) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { category_id: selected.id });
      router.refresh();
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const label = currentCategory?.label ?? "-";

  if (!isSupportAgent || isClosed) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        {label}
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
            variant="secondary"
            className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            {label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {categories.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleChange(option)}
            className={currentCategory?.id === option.id ? "bg-gray-100" : ""}
          >
            {option.label}
            {currentCategory?.id === option.id && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
