"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TicketCategoryDropdown } from "@/components/shared/ticket-category-dropdown";
import { StatusBadgeDropdown } from "@/components/shared/status-badge-dropdown";
import { PriorityBadgeDropdown } from "@/components/shared/priority-badge-dropdown";
import { TemperatureBadgeDropdown } from "@/components/shared/temperature-badge-dropdown";
import { FunctionalTeamDropdown } from "@/components/shared/functional-team-dropdown";
import { SupportTeamDropdown } from "@/components/shared/support-team-dropdown";
import { AssignedUserDropdown } from "@/components/shared/assigned-user-dropdown";
import type { Team, SupportLevel } from "@/types/team.types";
import type { SlaInstance } from "@/types/sla.types";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTemperatureRow,
  TicketSupportLevelRow,
} from "@/types/ticket.types";
import {
  computeSlaDisplayInfo,
  computeElapsedMinutes,
  formatSlaCountdown,
  formatSlaMinutes,
  getTicketSlaInstance,
} from "@/lib/utils/sla";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";

const MIN_COL_WIDTH = 60;
const ROW_HEIGHT = 72;

interface ColDef {
  key: string;
  label: string;
  defaultWidth: number;
  sortCol?: string;
}

const BASE_COLUMNS: ColDef[] = [
  { key: "ticket_number", label: "Ticket ID",           defaultWidth: 105, sortCol: "ticket_number" },
  { key: "title",         label: "Title",               defaultWidth: 210, sortCol: "title" },
  { key: "category",      label: "Category",            defaultWidth: 145, sortCol: "category_id" },
  { key: "status",        label: "Status",              defaultWidth: 155, sortCol: "status_id" },
  { key: "priority",      label: "Priority",            defaultWidth: 120, sortCol: "priority_id" },
  { key: "sla_response",  label: "SLA Response Time",   defaultWidth: 155 },
  { key: "sla_resolution",label: "SLA Resolution Time", defaultWidth: 160 },
  { key: "functional_team", label: "Functional Team",  defaultWidth: 165 },
  { key: "support_team",  label: "Support Team",        defaultWidth: 200 },
];

const ASSIGNED_TO_COL: ColDef = { key: "assigned_to_col", label: "Assigned To",  defaultWidth: 175 };
const TEMPERATURE_COL: ColDef = { key: "temperature",     label: "Temperature",  defaultWidth: 125, sortCol: "temperature_id" };

const DATE_COLUMNS: ColDef[] = [
  { key: "created_at", label: "Created", defaultWidth: 135, sortCol: "created_at" },
  { key: "updated_at", label: "Updated", defaultWidth: 135, sortCol: "updated_at" },
];

const ALL_COLUMNS: ColDef[] = [...BASE_COLUMNS, ASSIGNED_TO_COL, TEMPERATURE_COL, ...DATE_COLUMNS];
const MY_COLUMNS: ColDef[]  = [...BASE_COLUMNS, TEMPERATURE_COL, ...DATE_COLUMNS];

export interface TicketRow {
  id: string;
  ticket_number: number;
  title: string;
  status: TicketStatusRow;
  priority: TicketPriorityRow;
  category?: TicketCategoryRow | null;
  temperature?: TicketTemperatureRow | null;
  support_level?: TicketSupportLevelRow | null;
  sla_instance: SlaInstance | SlaInstance[] | null | undefined;
  functional_team: Team | null | undefined;
  support_team: Team | null | undefined;
  assigned_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null | undefined;
  assigned_to: string | null | undefined;
  created_at: string;
  updated_at: string;
  resolved_at: string | null | undefined;
}

interface ResizableTicketTableProps {
  tickets: TicketRow[];
  variant: "all" | "my";
  isSupportAgent: boolean;
  currentUserId: string | null;
  statuses: TicketStatusRow[];
  priorities: TicketPriorityRow[];
  categories: TicketCategoryRow[];
  temperatures: TicketTemperatureRow[];
  supportLevels: TicketSupportLevelRow[];
}

function getDefaultWidths(columns: ColDef[]): Record<string, number> {
  return Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth]));
}

function loadStoredWidths(storageKey: string, columns: ColDef[]): Record<string, number> {
  const defaults = getDefaultWidths(columns);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, number> = { ...defaults };
    for (const col of columns) {
      const v = parsed[col.key];
      if (typeof v === "number" && v >= MIN_COL_WIDTH) {
        result[col.key] = v;
      }
    }
    return result;
  } catch {
    return defaults;
  }
}

export function ResizableTicketTable({
  tickets,
  variant,
  isSupportAgent,
  currentUserId,
  statuses,
  priorities,
  categories,
  temperatures,
  supportLevels,
}: ResizableTicketTableProps) {
  const columns = variant === "all" ? ALL_COLUMNS : MY_COLUMNS;
  const storageKey = `ticket-table-widths-${variant}`;

  const [widths, setWidths] = useState<Record<string, number>>(() =>
    getDefaultWidths(columns),
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setWidths(loadStoredWidths(storageKey, columns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir");

  const handleSort = (sortCol: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (currentSort !== sortCol) {
      params.set("sort", sortCol);
      params.set("dir", "asc");
    } else if (currentDir === "asc") {
      params.set("dir", "desc");
    } else {
      params.delete("sort");
      params.delete("dir");
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  const handleResizeMouseDown = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = widthsRef.current[colKey] ?? MIN_COL_WIDTH;

      setIsDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
        setWidths((prev) => ({ ...prev, [colKey]: newWidth }));
      };

      const onMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try {
          localStorage.setItem(storageKey, JSON.stringify(widthsRef.current));
        } catch {}
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [storageKey],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const totalWidth = columns.reduce((sum, c) => sum + (widths[c.key] ?? c.defaultWidth), 0);

  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className="caption-bottom text-sm border-collapse"
        style={{ tableLayout: "fixed", width: totalWidth }}
      >
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: widths[col.key] ?? col.defaultWidth }} />
          ))}
        </colgroup>

        <thead className="border-b">
          <tr>
            {columns.map((col) => {
              const isActive = !!col.sortCol && currentSort === col.sortCol;
              const SortIcon =
                !isActive ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown;

              return (
                <th
                  key={col.key}
                  className="group relative h-12 px-4 text-left align-middle font-medium text-muted-foreground overflow-hidden select-none"
                >
                  {col.sortCol ? (
                    <button
                      onClick={() => handleSort(col.sortCol!)}
                      className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-gray-900 transition-colors whitespace-nowrap"
                    >
                      {col.label}
                      <SortIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-gray-300 group-hover:text-gray-500",
                        )}
                      />
                    </button>
                  ) : (
                    <span className="whitespace-nowrap font-medium">{col.label}</span>
                  )}

                  <div
                    className="group/resize absolute right-0 top-0 h-full w-4 cursor-col-resize z-10 flex items-center justify-center"
                    onMouseDown={(e) => handleResizeMouseDown(col.key, e)}
                  >
                    <div
                      className={cn(
                        "h-full w-px transition-colors",
                        isDragging ? "bg-primary-400" : "bg-gray-200 group-hover/resize:bg-primary-400",
                      )}
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="[&_tr:last-child]:border-0">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <TicketTableRow
                key={ticket.id}
                ticket={ticket}
                variant={variant}
                isSupportAgent={isSupportAgent}
                currentUserId={currentUserId}
                statuses={statuses}
                priorities={priorities}
                categories={categories}
                temperatures={temperatures}
                supportLevels={supportLevels}
              />
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-gray-500 py-8"
              >
                {variant === "all"
                  ? "No tickets found"
                  : "No tickets assigned to you"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TicketTableRow({
  ticket,
  variant,
  isSupportAgent,
  currentUserId,
  statuses,
  priorities,
  categories,
  temperatures,
  supportLevels,
}: {
  ticket: TicketRow;
  variant: "all" | "my";
  isSupportAgent: boolean;
  currentUserId: string | null;
  statuses: TicketStatusRow[];
  priorities: TicketPriorityRow[];
  categories: TicketCategoryRow[];
  temperatures: TicketTemperatureRow[];
  supportLevels: TicketSupportLevelRow[];
}) {
  const slaInstance = getTicketSlaInstance(ticket.sla_instance ?? null);
  const now = new Date();
  const slaInfo = slaInstance
    ? computeSlaDisplayInfo(
        slaInstance,
        ticket.status.name,
        ticket.resolved_at ?? null,
        now,
      )
    : null;

  const isClosed = ticket.status.name === "closed";
  const h = ROW_HEIGHT;

  const cellClass = "p-0 overflow-hidden border-b";
  const innerClass = "flex items-center px-4 overflow-hidden";

  return (
    <tr className="transition-colors hover:bg-muted/50 cursor-pointer">
      {/* Ticket ID */}
      <td className={cellClass}>
        <Link
          href={`/tickets/${ticket.id}`}
          className={cn(innerClass, "text-primary hover:underline")}
          style={{ height: h }}
        >
          <span className="truncate">{formatTicketNumber(ticket.ticket_number)}</span>
        </Link>
      </td>

      {/* Title */}
      <td className={cellClass}>
        <Link
          href={`/tickets/${ticket.id}`}
          className="flex items-start px-4 overflow-hidden hover:underline"
          style={{ height: h, paddingTop: 16, paddingBottom: 16 }}
        >
          <span className="line-clamp-2 leading-5">{ticket.title}</span>
        </Link>
      </td>

      {/* Category */}
      <td className={cellClass}>
        <div className={innerClass} style={{ height: h }}>
          <TicketCategoryDropdown
            ticketId={ticket.id}
            currentCategory={ticket.category ?? null}
            categories={categories}
            isSupportAgent={isSupportAgent}
            isClosed={isClosed}
          />
        </div>
      </td>

      {/* Status */}
      <td className={cellClass}>
        <div className={innerClass} style={{ height: h }}>
          <StatusBadgeDropdown
            ticketId={ticket.id}
            currentStatus={ticket.status}
            statuses={statuses}
            isSupportAgent={isSupportAgent}
            isClosed={isClosed}
          />
        </div>
      </td>

      {/* Priority */}
      <td className={cellClass}>
        <div className={innerClass} style={{ height: h }}>
          <PriorityBadgeDropdown
            ticketId={ticket.id}
            currentPriority={ticket.priority}
            priorities={priorities}
            isSupportAgent={isSupportAgent}
            isClosed={isClosed}
          />
        </div>
      </td>

      {/* SLA Response Time */}
      <td className={cellClass}>
        <div className={cn(innerClass, "text-sm")} style={{ height: h }}>
          {slaInfo ? (
            slaInfo.responseStatus === "met" ? (
              <span className="text-green-700 font-medium truncate">Met</span>
            ) : slaInfo.responseStatus === "breached" ? (
              <span className="text-red-700 font-medium truncate">
                {formatSlaMinutes(
                  computeElapsedMinutes(
                    ticket.created_at,
                    slaInstance!.responded_at,
                    now,
                  ),
                )}
              </span>
            ) : (
              <span
                className={cn(
                  "truncate",
                  slaInfo.responseMinutesRemaining <= 60
                    ? "text-amber-700"
                    : "text-gray-700",
                )}
              >
                {formatSlaCountdown(slaInfo.responseMinutesRemaining)}
              </span>
            )
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </td>

      {/* SLA Resolution Time */}
      <td className={cellClass}>
        <div className={cn(innerClass, "text-sm")} style={{ height: h }}>
          {slaInfo ? (
            slaInfo.resolutionStatus === "met" ? (
              <span className="text-green-700 font-medium truncate">Met</span>
            ) : slaInfo.resolutionStatus === "breached" ? (
              <span className="text-red-700 truncate">
                {formatSlaMinutes(
                  computeElapsedMinutes(
                    ticket.created_at,
                    ticket.resolved_at ?? null,
                    now,
                  ),
                )}
              </span>
            ) : (
              <span
                className={cn(
                  "truncate",
                  slaInfo.resolutionStatus === "at_risk"
                    ? "text-amber-700"
                    : "text-gray-700",
                )}
              >
                {formatSlaCountdown(slaInfo.resolutionMinutesRemaining)}
              </span>
            )
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </td>

      {/* Functional Team */}
      <td className={cellClass}>
        <div className={innerClass} style={{ height: h }}>
          <FunctionalTeamDropdown
            ticketId={ticket.id}
            currentTeam={(ticket.functional_team as Team | undefined) ?? null}
            isSupportAgent={isSupportAgent}
            isClosed={isClosed}
          />
        </div>
      </td>

      {/* Support Team */}
      <td className={cellClass}>
        <div className={innerClass} style={{ height: h }}>
          <SupportTeamDropdown
            ticketId={ticket.id}
            currentTeam={(ticket.support_team as Team | undefined) ?? null}
            currentLevel={(ticket.support_level?.name as SupportLevel) || "L1"}
            isSupportAgent={isSupportAgent}
            isClosed={isClosed}
          />
        </div>
      </td>

      {/* Assigned To — all-tickets only */}
      {variant === "all" && (
        <td className={cellClass}>
          <div className={innerClass} style={{ height: h }}>
            <AssignedUserDropdown
              ticketId={ticket.id}
              assignedUser={
                ticket.assigned_user
                  ? {
                      id: ticket.assigned_user.id,
                      full_name: ticket.assigned_user.full_name ?? "",
                      avatar_url: ticket.assigned_user.avatar_url,
                    }
                  : null
              }
              isSupportAgent={isSupportAgent}
              isClosed={isClosed}
              compact
            />
          </div>
        </td>
      )}

      {/* Temperature */}
      <td className={cellClass}>
        <div className={innerClass} style={{ height: h }}>
          <TemperatureBadgeDropdown
            ticketId={ticket.id}
            currentTemperature={ticket.temperature ?? null}
            temperatures={temperatures}
            isAssignedUser={!!(currentUserId && ticket.assigned_to === currentUserId)}
            isClosed={isClosed}
          />
        </div>
      </td>

      {/* Created */}
      <td className={cellClass}>
        <Link
          href={`/tickets/${ticket.id}`}
          className={cn(innerClass, "text-gray-500")}
          style={{ height: h }}
        >
          <span className="truncate">{formatRelativeTime(ticket.created_at)}</span>
        </Link>
      </td>

      {/* Updated */}
      <td className={cellClass}>
        <Link
          href={`/tickets/${ticket.id}`}
          className={cn(innerClass, "text-gray-500")}
          style={{ height: h }}
        >
          <span className="truncate">{formatRelativeTime(ticket.updated_at)}</span>
        </Link>
      </td>
    </tr>
  );
}
