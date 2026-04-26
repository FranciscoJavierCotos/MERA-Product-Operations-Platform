"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  paramName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  paramName = "page",
  className,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(String(currentPage));

  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const goToPage = (page: number) => {
    const target = Math.min(Math.max(1, page), Math.max(1, totalPages));
    if (target === currentPage) return;
    const params = new URLSearchParams(searchParams.toString());
    if (target === 1) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(target));
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const onSubmitInput = () => {
    const parsed = parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) {
      setInputValue(String(currentPage));
      return;
    }
    goToPage(parsed);
  };

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-gray-600">
        {totalCount === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium">{rangeStart}</span>–
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{totalCount}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="First page"
          onClick={() => goToPage(1)}
          disabled={isFirst || isPending}
          className="h-9 w-9"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          onClick={() => goToPage(currentPage - 1)}
          disabled={isFirst || isPending}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Page</span>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitInput();
              }
            }}
            onBlur={onSubmitInput}
            aria-label="Go to page"
            className="h-9 w-14 text-center"
            disabled={totalPages <= 1 || isPending}
          />
          <span className="whitespace-nowrap">
            of <span className="font-medium">{Math.max(1, totalPages)}</span>
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          onClick={() => goToPage(currentPage + 1)}
          disabled={isLast || isPending}
          className="h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Last page"
          onClick={() => goToPage(totalPages)}
          disabled={isLast || isPending}
          className="h-9 w-9"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
