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
import type { Company } from "@/types/company.types";
import { ChevronDown } from "lucide-react";

interface CompanyDropdownProps {
  ticketId: string;
  currentCompany: { id: string; name: string } | null | undefined;
  companies: Company[];
  isSupportAgent: boolean;
  isClosed: boolean;
  chevronClassName?: string;
}

export function CompanyDropdown({
  ticketId,
  currentCompany,
  companies,
  isSupportAgent,
  isClosed,
  chevronClassName,
}: CompanyDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (companyId: string | null) => {
    if (isUpdating) return;
    if (companyId === (currentCompany?.id ?? null)) return;

    setIsUpdating(true);
    try {
      await updateTicket(supabase, ticketId, { company_id: companyId });
      router.refresh();
    } catch (error) {
      console.error("Failed to update company:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const label = currentCompany?.name ?? "—";

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
          className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-md"
          disabled={isUpdating}
        >
          <Badge
            variant="secondary"
            className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            {label}
            <ChevronDown className={`h-3 w-3 ${chevronClassName ?? ""}`} />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => handleChange(null)}
          className={!currentCompany ? "bg-gray-100 dark:bg-gray-800" : ""}
        >
          <span className="text-muted-foreground">No company</span>
          {!currentCompany && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => handleChange(company.id)}
            className={currentCompany?.id === company.id ? "bg-gray-100 dark:bg-gray-800" : ""}
          >
            {company.name}
            {currentCompany?.id === company.id && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
