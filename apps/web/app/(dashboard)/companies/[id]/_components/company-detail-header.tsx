"use client";

import Link from "next/link";
import { ChevronLeft, Building2, Globe, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { CompanyDetail } from "@/types/company.types";
import { getHealthConfig } from "@/types/company.types";

export function CompanyDetailHeader({ company }: { company: CompanyDetail }) {
  const health = getHealthConfig(company.healthStatus?.name);

  return (
    <div>
      <Link
        href="/companies"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        All companies
      </Link>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <Building2 className="h-6 w-6 text-gray-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {company.name}
            </h1>
            <Badge variant="outline" className={cn("text-xs", health.color)}>
              <span aria-hidden className="mr-1">{health.emoji}</span>
              {health.label}
            </Badge>
            {company.industry && (
              <Badge variant="secondary" className="text-xs">
                {company.industry}
              </Badge>
            )}
          </div>

          {company.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {company.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {company.account_owner && (
              <span className="inline-flex items-center gap-1">
                <UserCircle2 className="h-3.5 w-3.5" />
                {company.account_owner.full_name}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
