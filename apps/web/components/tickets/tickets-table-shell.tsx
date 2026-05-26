"use client";

import { useTableDensity } from "@/lib/hooks/use-table-density";
import { ResizableTicketTable, type TicketRow } from "@/components/tickets/resizable-ticket-table";
import { TicketsTableToolbar } from "@/components/tickets/tickets-table-toolbar";
import { Pagination } from "@/components/shared/pagination";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTemperatureRow,
  TicketSupportLevelRow,
} from "@/types/ticket.types";

interface TicketsTableShellProps {
  tickets: TicketRow[];
  variant: "all" | "my";
  isSupportAgent: boolean;
  currentUserId: string | null;
  statuses: TicketStatusRow[];
  priorities: TicketPriorityRow[];
  categories: TicketCategoryRow[];
  temperatures: TicketTemperatureRow[];
  supportLevels: TicketSupportLevelRow[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    rangeStart: number;
    rangeEnd: number;
  };
}

export function TicketsTableShell({
  tickets,
  variant,
  isSupportAgent,
  currentUserId,
  statuses,
  priorities,
  categories,
  temperatures,
  supportLevels,
  pagination,
}: TicketsTableShellProps) {
  const [density, setDensity] = useTableDensity();

  return (
    <>
      <TicketsTableToolbar
        density={density}
        onDensityChange={setDensity}
        pageSize={pagination.pageSize}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        totalCount={pagination.totalCount}
      />
      <ResizableTicketTable
        tickets={tickets}
        variant={variant}
        isSupportAgent={isSupportAgent}
        currentUserId={currentUserId}
        statuses={statuses}
        priorities={priorities}
        categories={categories}
        temperatures={temperatures}
        supportLevels={supportLevels}
        density={density}
      />
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        pageSize={pagination.pageSize}
      />
    </>
  );
}
