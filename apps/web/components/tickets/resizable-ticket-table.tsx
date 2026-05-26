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
  formatSlaCountdown,
  getTicketSlaInstance,
} from "@/lib/utils/sla";
import { formatTicketNumber } from "@/lib/utils/format";
import { formatRelativeTime } from "@/lib/utils/date";
import { DENSITY_ROW_HEIGHT, type TableDensity } from "@/lib/hooks/use-table-density";

const MIN_COL_WIDTH = 60;
const CHEVRON_HIDE = "row-hover-only";

interface ColDef {
  key: string;
  label: string;
  defaultWidth: number;
  sortCol?: string;
}

const BASE_COLUMNS: ColDef[] = [
  { key: "ticket_number", label: "Ticket ID",       defaultWidth: 105, sortCol: "ticket_number" },
  { key: "title",         label: "Title",           defaultWidth: 240, sortCol: "title" },
  { key: "category",      label: "Category",        defaultWidth: 140, sortCol: "category_id" },
  { key: "status",        label: "Status",          defaultWidth: 145, sortCol: "status_id" },
  { key: "priority",      label: "Priority",        defaultWidth: 120, sortCol: "priority_id" },
  { key: "sla",           label: "SLA",             defaultWidth: 180 },
  { key: "functional_team", label: "Functional Team", defaultWidth: 165 },
  { key: "support_team",  label: "Support Team",    defaultWidth: 200 },
];

const ASSIGNED_TO_COL: ColDef = { key: "assigned_to_col", label: "Assigned To",  defaultWidth: 175 };
const TEMPERATURE_COL: ColDef = { key: "temperature",     label: "Temp.",         defaultWidth: 80, sortCol: "temperature_id" };

const ACTIVITY_COL: ColDef = { key: "activity", label: "Activity", defaultWidth: 150, sortCol: "updated_at" };

const ALL_COLUMNS: ColDef[] = [...BASE_COLUMNS, ASSIGNED_TO_COL, TEMPERATURE_COL, ACTIVITY_COL];
const MY_COLUMNS: ColDef[]  = [...BASE_COLUMNS, TEMPERATURE_COL, ACTIVITY_COL];

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
  density?: TableDensity;
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
  density = "default",
}: ResizableTicketTableProps) {
  const columns = variant === "all" ? ALL_COLUMNS : MY_COLUMNS;
  // Storage key is v2 because column shape changed (sla collapsed, activity merged).
  const storageKey = `ticket-table-widths-v2-${variant}`;

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

  const rowHeight = DENSITY_ROW_HEIGHT[density];

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
        className="caption-bottom text-sm border-collapse row-hover-chrome"
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
                  className="group relative h-11 px-4 text-left align-middle font-medium text-muted-foreground overflow-hidden select-none"
                >
                  {col.sortCol ? (
                    <button
                      onClick={() => handleSort(col.sortCol!)}
                      className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors whitespace-nowrap"
                    >
                      {col.label}
                      <SortIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-opacity",
                          isActive
                            ? "text-primary opacity-100"
                            : "opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500",
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
                        isDragging ? "bg-primary-400" : "bg-gray-200 dark:bg-gray-700 group-hover/resize:bg-primary-400",
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
                rowHeight={rowHeight}
                density={density}
              />
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-gray-500 dark:text-gray-400 py-8"
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
  rowHeight,
  density,
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
  rowHeight: number;
  density: TableDensity;
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
  const h = rowHeight;

  const cellClass = "p-0 overflow-hidden border-b";
  const innerClass = "flex items-center px-4 overflow-hidden";

  // In compact mode title gets one line; in default/comfortable it can wrap.
  const titleClamp = density === "compact" ? "line-clamp-1" : "line-clamp-2";
  const titleVerticalPad = density === "compact" ? 8 : 12;

  return (
    <tr className="transition-colors hover:bg-muted/50 cursor-pointer">
      {/* Ticket ID */}
      <td className={cellClass}>
        <Link
          href={`/tickets/${ticket.id}`}
          className={cn(innerClass, "text-primary hover:underline tabular-nums")}
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
          style={{
            height: h,
            paddingTop: titleVerticalPad,
            paddingBottom: titleVerticalPad,
          }}
        >
          <span className={cn(titleClamp, "leading-5")}>{ticket.title}</span>
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
            quietEmpty
            chevronClassName={CHEVRON_HIDE}
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
            chevronClassName={CHEVRON_HIDE}
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
            chevronClassName={CHEVRON_HIDE}
          />
        </div>
      </td>

      {/* SLA — single dual-line column */}
      <td className={cellClass}>
        <div className={cn(innerClass, "text-xs leading-tight")} style={{ height: h }}>
          {slaInfo ? (
            <div className="flex flex-col gap-0.5 truncate">
              <SlaLine
                kind="response"
                status={slaInfo.responseStatus}
                minutesRemaining={slaInfo.responseMinutesRemaining}
              />
              <SlaLine
                kind="resolution"
                status={slaInfo.resolutionStatus}
                minutesRemaining={slaInfo.resolutionMinutesRemaining}
              />
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
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
            quietEmpty
            chevronClassName={CHEVRON_HIDE}
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
            chevronClassName={CHEVRON_HIDE}
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
              quietEmpty
              chevronClassName={CHEVRON_HIDE}
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

      {/* Activity — merged Updated (primary) + Created (secondary) */}
      <td className={cellClass}>
        <Link
          href={`/tickets/${ticket.id}`}
          className={cn(innerClass, "text-sm tabular-nums")}
          style={{ height: h }}
        >
          {density === "compact" ? (
            <span className="truncate">
              Updated {formatRelativeTime(ticket.updated_at)}
            </span>
          ) : (
            <div className="flex flex-col leading-tight">
              <span className="text-foreground/90 text-sm truncate">
                Updated {formatRelativeTime(ticket.updated_at)}
              </span>
              <span className="text-muted-foreground text-[11px] truncate">
                Created {formatRelativeTime(ticket.created_at)}
              </span>
            </div>
          )}
        </Link>
      </td>
    </tr>
  );
}

/* ───────────── SLA semantic line ───────────── */

interface SlaLineProps {
  kind: "response" | "resolution";
  status: string;
  minutesRemaining: number;
}

function SlaLine({ kind, status, minutesRemaining }: SlaLineProps) {
  const isResponse = kind === "response";

  // Map state → dot color + label + value style
  let dotClass = "bg-muted-foreground/40";
  let labelClass = "text-muted-foreground";
  let label = isResponse ? "Response" : "Resolution";
  let valueClass = "text-muted-foreground";
  let value: string | null = null;

  if (status === "met") {
    dotClass = "bg-green-500";
    labelClass = "text-green-700 dark:text-green-400";
    label = isResponse ? "Responded" : "Met";
    valueClass = "text-green-700 dark:text-green-400";
  } else if (status === "breached") {
    dotClass = "bg-red-500";
    labelClass = "text-red-700 dark:text-red-400 font-medium";
    label = isResponse ? "Resp. breached" : "Res. breached";
    valueClass = "text-red-700 dark:text-red-400 font-medium";
  } else if (status === "at_risk") {
    dotClass = "bg-amber-500";
    labelClass = "text-amber-700 dark:text-amber-400";
    label = isResponse ? "Resp. at risk" : "Res. at risk";
    valueClass = "text-amber-700 dark:text-amber-400";
    value = formatSlaCountdown(minutesRemaining);
  } else if (status === "pending") {
    // Response — not yet responded
    dotClass = minutesRemaining <= 60 ? "bg-amber-500" : "bg-muted-foreground/50";
    labelClass = minutesRemaining <= 60 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground";
    label = "Pending response";
    valueClass = minutesRemaining <= 60 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground";
    value = formatSlaCountdown(minutesRemaining);
  } else if (status === "on_track") {
    dotClass = "bg-emerald-500/70";
    labelClass = "text-muted-foreground";
    label = isResponse ? "Response" : "Resolution";
    valueClass = "text-foreground/80";
    value = formatSlaCountdown(minutesRemaining);
  }

  return (
    <div className="flex items-center gap-1.5 truncate">
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      <span className={cn("text-[11px] truncate", labelClass)}>{label}</span>
      {value && (
        <span className={cn("ml-auto text-[11px] tabular-nums shrink-0", valueClass)}>
          {value}
        </span>
      )}
    </div>
  );
}
