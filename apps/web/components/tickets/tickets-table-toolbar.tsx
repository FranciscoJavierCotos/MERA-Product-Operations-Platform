"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Rows2, Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TableDensity } from "@/lib/hooks/use-table-density";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface TicketsTableToolbarProps {
  density: TableDensity;
  onDensityChange: (next: TableDensity) => void;
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
}

export function TicketsTableToolbar({
  density,
  onDensityChange,
  pageSize,
  rangeStart,
  rangeEnd,
  totalCount,
}: TicketsTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setPageSize = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "25") {
      params.delete("page_size");
    } else {
      params.set("page_size", value);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  return (
    <div className="flex flex-col-reverse gap-2 border-b border-border/60 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground tabular-nums">
        {totalCount === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{rangeStart}</span>–
            <span className="font-medium text-foreground">{rangeEnd}</span> of{" "}
            <span className="font-medium text-foreground">{totalCount}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        {/* Density toggle */}
        <div
          className="inline-flex items-center rounded-md border border-border/70 bg-background p-0.5"
          role="radiogroup"
          aria-label="Row density"
        >
          <DensityButton
            label="Comfortable"
            icon={<Rows2 className="h-3.5 w-3.5" />}
            active={density === "comfortable"}
            onClick={() => onDensityChange("comfortable")}
          />
          <DensityButton
            label="Default"
            icon={<Rows3 className="h-3.5 w-3.5" />}
            active={density === "default"}
            onClick={() => onDensityChange("default")}
          />
          <DensityButton
            label="Compact"
            icon={<Rows4 className="h-3.5 w-3.5" />}
            active={density === "compact"}
            onClick={() => onDensityChange("compact")}
          />
        </div>

        {/* Page size */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Rows</span>
          <Select value={String(pageSize)} onValueChange={setPageSize}>
            <SelectTrigger className="h-7 w-[68px] text-xs tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="tabular-nums">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function DensityButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}
