"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { SlaInstance, SlaDisplayInfo } from "@/types/sla.types";
import {
  computeSlaDisplayInfo,
  computeElapsedMinutes,
  formatSlaCountdown,
  formatSlaMinutes,
} from "@/lib/utils/sla";
import { formatDateTime } from "@/lib/utils/date";

interface SlaDetailBlockProps {
  instance: SlaInstance | null | undefined;
  ticketStatus: string;
  resolvedAt?: string | null;
  createdAt?: string | null;
}

const statusBadgeClass: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  at_risk: "bg-amber-100 text-amber-800",
  breached: "bg-red-100 text-red-800",
  met: "bg-green-100 text-green-800",
  pending: "bg-gray-100 text-gray-600",
};

const responseStatusLabel: Record<string, string> = {
  met: "✓ Responded",
  breached: "Missed",
  pending: "Pending",
};

function ProgressBar({ minutesRemaining, totalMinutes }: { minutesRemaining: number; totalMinutes: number }) {
  const isBreached = minutesRemaining < 0;
  const isAtRisk = minutesRemaining >= 0 && minutesRemaining <= 60;
  // Show elapsed time: bar fills 0→100% as the deadline approaches
  const pct = isBreached
    ? 100
    : Math.max(0, Math.min(100, ((totalMinutes - minutesRemaining) / totalMinutes) * 100));

  return (
    <div className="mt-1 h-[3px] w-full rounded-full bg-gray-200 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          isBreached ? "bg-red-500" : isAtRisk ? "bg-amber-400" : "bg-green-500",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SlaDetailBlock({
  instance,
  ticketStatus,
  resolvedAt,
  createdAt,
}: SlaDetailBlockProps) {
  const [info, setInfo] = useState<SlaDisplayInfo | null>(
    instance ? computeSlaDisplayInfo(instance, ticketStatus, resolvedAt) : null,
  );

  // Refresh countdown every 60 seconds for active tickets
  useEffect(() => {
    if (!instance) return;
    const isTerminal = ticketStatus === "resolved" || ticketStatus === "closed";
    if (isTerminal) return;

    const id = setInterval(() => {
      setInfo(computeSlaDisplayInfo(instance, ticketStatus, resolvedAt));
    }, 60_000);

    return () => clearInterval(id);
  }, [instance, ticketStatus, resolvedAt]);

  if (!instance || !info) {
    return (
      <div>
        <h3 className="text-sm font-medium text-gray-700">SLA</h3>
        <p className="mt-2 text-sm text-gray-400">No SLA assigned</p>
      </div>
    );
  }

  const policy = instance.policy;
  const isTerminal = ticketStatus === "resolved" || ticketStatus === "closed";
  const resolutionTotalMinutes = policy?.resolution_time_minutes ?? 60;
  const responseTotalMinutes = policy?.response_time_minutes ?? 60;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700">SLA</h3>
      <div className="mt-2 space-y-3">
        {policy && (
          <p className="text-xs text-gray-500">
            {policy.name} — Resolution target:{" "}
            <span className="font-medium">{formatSlaMinutes(policy.resolution_time_minutes)}</span>
          </p>
        )}

        {/* Response SLA row */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Response</span>
            {info.responseStatus === "breached" && createdAt ? (
              <span className="text-xs font-medium text-red-700">
                {formatSlaMinutes(
                  computeElapsedMinutes(createdAt, info.respondedAt),
                )}
              </span>
            ) : (
              <Badge
                className={cn(
                  "text-xs",
                  statusBadgeClass[info.responseStatus],
                )}
              >
                {responseStatusLabel[info.responseStatus]}
              </Badge>
            )}
          </div>
          {info.respondedAt ? (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDateTime(info.respondedAt)}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              Due by {formatDateTime(info.responseDueAt)}
            </p>
          )}
          {!info.respondedAt && !isTerminal && info.responseStatus !== "breached" && (
            <ProgressBar
              minutesRemaining={info.responseMinutesRemaining}
              totalMinutes={responseTotalMinutes}
            />
          )}
        </div>

        {/* Resolution SLA row */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Resolution</span>
            <Badge
              className={cn(
                "text-xs",
                statusBadgeClass[info.resolutionStatus],
              )}
            >
              {info.resolutionStatus === "met"
                ? "✓ Met"
                : info.resolutionStatus === "breached"
                  ? "Breached"
                  : info.resolutionStatus === "at_risk"
                    ? "At Risk"
                    : "On Track"}
            </Badge>
            {info.isPaused && !isTerminal && (
              <Badge className="text-xs bg-gray-100 text-gray-600">
                Paused
              </Badge>
            )}
          </div>
          <p className={cn("text-xs mt-0.5", info.resolutionStatus === "breached" ? "text-red-700 font-medium" : "text-gray-500")}>
            {info.resolutionStatus === "breached" && createdAt
              ? formatSlaMinutes(
                  computeElapsedMinutes(createdAt, isTerminal ? resolvedAt : null),
                )
              : isTerminal
                ? info.resolutionMinutesRemaining >= 0
                  ? `Resolved ${formatSlaMinutes(info.resolutionMinutesRemaining)} early`
                  : `${formatSlaMinutes(Math.abs(info.resolutionMinutesRemaining))} late`
                : formatSlaCountdown(info.resolutionMinutesRemaining)}
          </p>
          {!isTerminal && (
            <ProgressBar
              minutesRemaining={info.resolutionMinutesRemaining}
              totalMinutes={resolutionTotalMinutes}
            />
          )}
        </div>
      </div>
    </div>
  );
}
