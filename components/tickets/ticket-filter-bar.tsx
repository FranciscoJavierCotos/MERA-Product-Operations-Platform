"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTemperatureRow,
} from "@/types/ticket.types";

interface FilterOption {
  value: string;
  label: string;
}

export interface TicketFilterBarProps {
  statuses: TicketStatusRow[];
  priorities: TicketPriorityRow[];
  categories: TicketCategoryRow[];
  temperatures: TicketTemperatureRow[];
  functionalTeams: FilterOption[];
  supportTeams: FilterOption[];
  supportMembers?: FilterOption[];
  showAssignedTo?: boolean;
}

const ALL = "_all";

const FILTER_KEYS = [
  "search",
  "status",
  "priority",
  "category",
  "temperature",
  "functional_team",
  "support_team",
  "assigned_to",
  "created_from",
  "created_to",
] as const;

export function TicketFilterBar({
  statuses,
  priorities,
  categories,
  temperatures,
  functionalTeams,
  supportTeams,
  supportMembers,
  showAssignedTo,
}: TicketFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentTemperature = searchParams.get("temperature") ?? "";
  const currentFunctionalTeam = searchParams.get("functional_team") ?? "";
  const currentSupportTeam = searchParams.get("support_team") ?? "";
  const currentAssignedTo = searchParams.get("assigned_to") ?? "";
  const currentCreatedFrom = searchParams.get("created_from") ?? "";
  const currentCreatedTo = searchParams.get("created_to") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  const applyFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applyFilter("search", value || null);
    }, 350);
  };

  const handleSelect = (key: string, value: string) => {
    applyFilter(key, value === ALL ? null : value);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => params.delete(k));
    params.delete("page");
    const qs = params.toString();
    setSearchValue("");
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const activeCount = [
    currentSearch,
    currentStatus,
    currentPriority,
    currentCategory,
    currentTemperature,
    currentFunctionalTeam,
    currentSupportTeam,
    currentAssignedTo,
    currentCreatedFrom,
    currentCreatedTo,
  ].filter(Boolean).length;

  const activeTriggerCn = (value: string) =>
    cn(
      "h-9 w-auto text-sm",
      value && "border-blue-400 bg-blue-50 text-blue-800",
    );

  return (
    <div
      className={cn(
        "rounded-lg border bg-white shadow-sm transition-opacity",
        isPending && "opacity-75",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600">Filters</span>
          {activeCount > 0 && (
            <Badge className="bg-blue-100 px-1.5 py-0 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              {activeCount} active
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            disabled={isPending}
            className="h-7 gap-1 px-2 text-xs text-gray-400 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by title..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              "h-9 pl-8 pr-8 text-sm",
              currentSearch && "border-blue-400 bg-blue-50",
            )}
          />
          {searchValue && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchValue("");
                if (debounceRef.current) clearTimeout(debounceRef.current);
                applyFilter("search", null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select
          value={currentStatus || ALL}
          onValueChange={(v) => handleSelect("status", v)}
        >
          <SelectTrigger className={cn(activeTriggerCn(currentStatus), "min-w-[120px]")}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={currentPriority || ALL}
          onValueChange={(v) => handleSelect("priority", v)}
        >
          <SelectTrigger className={cn(activeTriggerCn(currentPriority), "min-w-[110px]")}>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={currentCategory || ALL}
          onValueChange={(v) => handleSelect("category", v)}
        >
          <SelectTrigger className={cn(activeTriggerCn(currentCategory), "min-w-[120px]")}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Temperature */}
        <Select
          value={currentTemperature || ALL}
          onValueChange={(v) => handleSelect("temperature", v)}
        >
          <SelectTrigger className={cn(activeTriggerCn(currentTemperature), "min-w-[120px]")}>
            <SelectValue placeholder="Temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All temperatures</SelectItem>
            {temperatures.map((t) => (
              <SelectItem key={t.id} value={t.name}>
                {t.emoji} {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Functional Team */}
        {functionalTeams.length > 0 && (
          <Select
            value={currentFunctionalTeam || ALL}
            onValueChange={(v) => handleSelect("functional_team", v)}
          >
            <SelectTrigger
              className={cn(activeTriggerCn(currentFunctionalTeam), "min-w-[150px]")}
            >
              <SelectValue placeholder="Functional Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All functional teams</SelectItem>
              {functionalTeams.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Support Team */}
        {supportTeams.length > 0 && (
          <Select
            value={currentSupportTeam || ALL}
            onValueChange={(v) => handleSelect("support_team", v)}
          >
            <SelectTrigger
              className={cn(activeTriggerCn(currentSupportTeam), "min-w-[145px]")}
            >
              <SelectValue placeholder="Support Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All support teams</SelectItem>
              {supportTeams.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Assigned To — All Tickets only */}
        {showAssignedTo && supportMembers && supportMembers.length > 0 && (
          <Select
            value={currentAssignedTo || ALL}
            onValueChange={(v) => handleSelect("assigned_to", v)}
          >
            <SelectTrigger
              className={cn(activeTriggerCn(currentAssignedTo), "min-w-[140px]")}
            >
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              {supportMembers.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Created date range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
            Created:
          </span>
          <Input
            type="date"
            value={currentCreatedFrom}
            onChange={(e) => applyFilter("created_from", e.target.value || null)}
            title="Created from"
            className={cn(
              "h-9 w-[138px] text-sm",
              currentCreatedFrom && "border-blue-400 bg-blue-50",
            )}
          />
          <span className="text-gray-300 text-sm select-none">–</span>
          <Input
            type="date"
            value={currentCreatedTo}
            onChange={(e) => applyFilter("created_to", e.target.value || null)}
            title="Created to"
            className={cn(
              "h-9 w-[138px] text-sm",
              currentCreatedTo && "border-blue-400 bg-blue-50",
            )}
          />
        </div>
      </div>
    </div>
  );
}
