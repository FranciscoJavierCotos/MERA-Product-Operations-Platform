"use client";

import Link from "next/link";
import { Building2, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import type { Company } from "@/types/company.types";
import { getHealthConfig } from "@/types/company.types";

export function CompanyCard({
  company,
  onEdit,
  onDelete,
}: {
  company: Company;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  const health = getHealthConfig(company.healthStatus?.name);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-lg border bg-white dark:bg-gray-900",
        "shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-150",
        "dark:border-gray-800 dark:hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between p-5">
        <Link href={`/companies/${company.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <Building2 className="h-4 w-4 text-gray-500" />
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {company.name}
            </span>
          </div>
          {company.industry && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {company.industry}
            </p>
          )}
          {company.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
              {company.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                health.color,
              )}
            >
              <span aria-hidden>{health.emoji}</span>
              {health.label}
            </span>
            {typeof company.contact_count === "number" && (
              <span className="text-xs text-gray-400">
                {company.contact_count} contact
                {company.contact_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-0.5 ml-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 cursor-pointer"
            aria-label="Edit company"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(company);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(company)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
