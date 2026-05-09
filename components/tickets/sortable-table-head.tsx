"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

interface SortableTableHeadProps {
  column: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableTableHead({
  column,
  children,
  className,
}: SortableTableHeadProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir");
  const isActive = currentSort === column;

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (!isActive) {
      params.set("sort", column);
      params.set("dir", "asc");
    } else if (currentDir === "asc") {
      params.set("dir", "desc");
    } else {
      params.delete("sort");
      params.delete("dir");
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const SortIcon = !isActive
    ? ArrowUpDown
    : currentDir === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead className={cn("group", className)}>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-gray-900 transition-colors whitespace-nowrap"
      >
        {children}
        <SortIcon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            isActive
              ? "text-blue-500"
              : "text-gray-300 group-hover:text-gray-500",
          )}
        />
      </button>
    </TableHead>
  );
}
