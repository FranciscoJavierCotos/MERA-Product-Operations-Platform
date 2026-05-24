import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { SlaInstance, SlaDisplayStatus } from "@/types/sla.types";
import { computeSlaDisplayInfo, formatSlaCountdown } from "@/lib/utils/sla";

interface SlaStatusBadgeProps {
  instance: SlaInstance | null | undefined;
  ticketStatus: string;
  resolvedAt?: string | null;
  className?: string;
}

const displayConfig: Record<
  SlaDisplayStatus,
  { label: string; className: string }
> = {
  on_track: {
    label: "On Track",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  at_risk: {
    label: "At Risk",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  breached: {
    label: "Breached",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  met: {
    label: "Met",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
};

export function SlaStatusBadge({
  instance,
  ticketStatus,
  resolvedAt,
  className,
}: SlaStatusBadgeProps) {
  if (!instance) return null;

  const info = computeSlaDisplayInfo(instance, ticketStatus, resolvedAt);
  const config = displayConfig[info.resolutionStatus];
  const isTerminal = ticketStatus === "resolved" || ticketStatus === "closed";

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <Badge className={config.className}>
        {info.resolutionStatus === "met" ? "✓ Met" : config.label}
      </Badge>
      {!isTerminal && (
        <span className="text-xs text-gray-500 leading-tight">
          {info.isPaused
            ? "Paused"
            : formatSlaCountdown(info.resolutionMinutesRemaining)}
        </span>
      )}
    </div>
  );
}
