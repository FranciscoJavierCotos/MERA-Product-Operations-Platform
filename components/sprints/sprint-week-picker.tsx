"use client";

import { useState } from "react";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SprintDateRange {
  start: Date;
  end: Date;
}

export interface ExistingSprintSlot {
  id: string;
  name: string;
  start_date: string | null; // "yyyy-MM-dd"
  end_date: string | null;   // "yyyy-MM-dd"
  status: "planned" | "active" | "completed";
}

interface Props {
  /** Sprint length (weeks) configured on the project (1–4). */
  sprintDurationWeeks: number;
  /** Currently committed selection. */
  value: SprintDateRange | null;
  onChange: (range: SprintDateRange) => void;
  onClear?: () => void;
  /** Already-scheduled sprints to overlay on the calendar. */
  existingSprints?: ExistingSprintSlot[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Export for sprint-form to format the selected range for the DB. */
export function formatDateISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Build the sprint range starting exactly on `day` (no Monday snap). */
function computeRange(day: Date, durationWeeks: number): SprintDateRange {
  return { start: day, end: addDays(day, durationWeeks * 7 - 1) };
}

/** Returns the first sprint (by priority) that contains `dayStr`, or null. */
function findSprintForDay(
  dayStr: string,
  sprints: ExistingSprintSlot[],
): ExistingSprintSlot | null {
  const PRIO = { active: 0, planned: 1, completed: 2 };
  const hits = sprints.filter(
    (s) =>
      s.start_date &&
      s.end_date &&
      dayStr >= s.start_date &&
      dayStr <= s.end_date,
  );
  if (!hits.length) return null;
  return hits.sort((a, b) => PRIO[a.status] - PRIO[b.status])[0];
}

// Per-status colour tokens
const STATUS_STYLE = {
  planned: {
    cap: "bg-violet-500 text-white",
    strip: "bg-violet-100 text-violet-900",
    dot: "bg-violet-400",
    label: "text-violet-700",
    legendBg: "bg-violet-100",
    legendText: "text-violet-700",
  },
  active: {
    cap: "bg-emerald-500 text-white",
    strip: "bg-emerald-100 text-emerald-900",
    dot: "bg-emerald-400",
    label: "text-emerald-700",
    legendBg: "bg-emerald-100",
    legendText: "text-emerald-700",
  },
  completed: {
    cap: "bg-gray-400 text-white",
    strip: "bg-gray-100 text-gray-500",
    dot: "bg-gray-300",
    label: "text-gray-500",
    legendBg: "bg-gray-100",
    legendText: "text-gray-500",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function SprintWeekPicker({
  sprintDurationWeeks,
  value,
  onChange,
  onClear,
  existingSprints = [],
}: Props) {
  const [viewDate, setViewDate] = useState<Date>(() => value?.start ?? new Date());
  const [hoverDay, setHoverDay] = useState<Date | null>(null);

  // Build a Mon-aligned 6-row grid for the current month view.
  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = addDays(gridStart, 41); // 6 rows × 7 cols
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Sprints that have valid date ranges
  const datedSprints = existingSprints.filter((s) => s.start_date && s.end_date);

  const isBlockedDay = (dayStr: string) => {
    const sp = findSprintForDay(dayStr, datedSprints);
    return sp !== null && sp.status !== "completed";
  };

  // Current selection range (hover preview wins over committed value)
  const activeHover =
    hoverDay && !isBlockedDay(format(hoverDay, "yyyy-MM-dd")) ? hoverDay : null;
  const highlightRange: SprintDateRange | null = activeHover
    ? computeRange(activeHover, sprintDurationWeeks)
    : (value ?? null);

  const isSelected = (dayStr: string) => {
    if (!highlightRange) return false;
    const s = formatDateISO(highlightRange.start);
    const e = formatDateISO(highlightRange.end);
    return dayStr >= s && dayStr <= e;
  };

  const handleClick = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    if (isBlockedDay(dayStr)) return;
    onChange(computeRange(day, sprintDurationWeeks));
  };

  const displayRange = value
    ? `${format(value.start, "MMM d")} → ${format(value.end, "MMM d, yyyy")}`
    : null;

  // Sprints to show in the legend — only those with dates, sorted chronologically
  const legendSprints = [...datedSprints].sort((a, b) =>
    (a.start_date ?? "").localeCompare(b.start_date ?? ""),
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 w-full select-none">
      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between mb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewDate((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-gray-800">
          {format(viewDate, "MMMM yyyy")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewDate((d) => addMonths(d, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Weekday header ── */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((lbl) => (
          <div key={lbl} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {lbl}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, viewDate);

          // ── Existing sprint overlay ──
          const occupant = findSprintForDay(dayStr, datedSprints);
          const blocked = occupant !== null && occupant.status !== "completed";
          const occupantStyle = occupant ? STATUS_STYLE[occupant.status] : null;
          const isOccStart = occupant?.start_date === dayStr;
          const isOccEnd = occupant?.end_date === dayStr;
          const isOccMiddle = !!occupant && !isOccStart && !isOccEnd;

          // ── New-sprint selection overlay ──
          const sel = isSelected(dayStr);
          const selStart =
            sel && highlightRange && formatDateISO(highlightRange.start) === dayStr;
          const selEnd =
            sel && highlightRange && formatDateISO(highlightRange.end) === dayStr;
          const selMiddle = sel && !selStart && !selEnd;

          // Selection wins visually over occupant.
          // Build class list:
          const bgClass = sel
            ? selStart
              ? "rounded-l-full bg-blue-500"
              : selEnd
              ? "rounded-r-full bg-blue-500"
              : "bg-blue-100"
            : occupant && occupantStyle
            ? isOccStart
              ? `rounded-l-full ${occupantStyle.cap.split(" ")[0]}`
              : isOccEnd
              ? `rounded-r-full ${occupantStyle.cap.split(" ")[0]}`
              : occupantStyle.strip.split(" ")[0]
            : "";

          const textClass = sel
            ? selStart || selEnd
              ? "text-white font-semibold"
              : "text-blue-900"
            : occupant && occupantStyle
            ? isOccStart || isOccEnd
              ? "text-white font-semibold"
              : occupantStyle.strip.split(" ")[1]
            : inMonth
            ? "text-gray-800"
            : "text-gray-300";

          const tooltip = occupant
            ? `${occupant.name}  ${occupant.start_date} → ${occupant.end_date}  [${occupant.status}]`
            : undefined;

          return (
            <div
              key={idx}
              role="button"
              tabIndex={blocked ? -1 : 0}
              aria-label={format(day, "MMMM d, yyyy")}
              aria-disabled={blocked}
              title={tooltip}
              className={cn(
                "relative h-8 flex items-center justify-center text-xs transition-colors",
                bgClass,
                textClass,
                !inMonth && "opacity-30",
                blocked
                  ? "cursor-not-allowed"
                  : "cursor-pointer",
                !sel && !occupant && "hover:bg-gray-100 rounded-full",
              )}
              onMouseEnter={() => setHoverDay(day)}
              onMouseLeave={() => setHoverDay(null)}
              onClick={() => handleClick(day)}
              onKeyDown={(e) => e.key === "Enter" && handleClick(day)}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>

      {/* ── Selected range summary ── */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between min-h-[28px]">
        {displayRange ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <CalendarDays className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              {displayRange}
              <span className="text-gray-400">({sprintDurationWeeks}w)</span>
            </span>
            {onClear && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-gray-400 hover:text-gray-700"
                onClick={onClear}
                aria-label="Clear date selection"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-400 italic">
            Click any day to start a {sprintDurationWeeks}-week sprint
          </span>
        )}
      </div>

      {/* ── Existing sprints legend ── */}
      {legendSprints.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
            Scheduled sprints
          </p>
          {legendSprints.map((sp) => {
            const s = STATUS_STYLE[sp.status];
            return (
              <div key={sp.id} className="flex items-center gap-2 text-xs">
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", s.dot)} />
                <span className={cn("font-medium", s.label)}>{sp.name}</span>
                <span className="text-gray-400 truncate">
                  {sp.start_date} → {sp.end_date}
                </span>
                <span
                  className={cn(
                    "ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium",
                    s.legendBg,
                    s.legendText,
                  )}
                >
                  {sp.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
