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
import type { TicketCategory } from "@/types/ticket.types";
import { ChevronDown } from "lucide-react";

interface TicketCategoryDropdownProps {
  ticketId: string;
  category: TicketCategory | null | undefined;
  isSupportAgent: boolean;
  isClosed: boolean;
}

const categoryOptions: Array<{ value: TicketCategory; label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature Request" },
  { value: "question", label: "Question" },
  { value: "configuration_request", label: "Configuration Request" },
];

const getCategoryLabel = (category: TicketCategory | null | undefined) => {
  const match = categoryOptions.find((o) => o.value === category);
  return match?.label ?? "-";
};

export function TicketCategoryDropdown({
  ticketId,
  category,
  isSupportAgent,
  isClosed,
}: TicketCategoryDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (newCategory: TicketCategory) => {
    if (isUpdating) return;
    if (newCategory === category) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { category: newCategory });
      router.refresh();
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSupportAgent || isClosed) {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        {getCategoryLabel(category)}
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
            variant="outline"
            className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            {getCategoryLabel(category)}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {categoryOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleChange(option.value)}
            className={category === option.value ? "bg-gray-100" : ""}
          >
            {option.label}
            {category === option.value && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
