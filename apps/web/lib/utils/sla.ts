import type {
  SlaInstance,
  SlaDisplayInfo,
  SlaStatus,
  SlaDisplayStatus,
} from "@/types/sla.types";

type TicketSlaValue = SlaInstance | SlaInstance[] | null | undefined;

export function getTicketSlaInstance(
  instance: TicketSlaValue,
): SlaInstance | null {
  if (!instance) return null;
  if (Array.isArray(instance)) return instance[0] ?? null;
  return instance;
}

export function computeSlaDisplayInfo(
  instance: SlaInstance,
  ticketStatus: string,
  resolvedAt: string | null | undefined,
  now: Date = new Date(),
): SlaDisplayInfo {
  const responseDue = new Date(instance.response_due_at);
  const resolutionDue = new Date(instance.resolution_due_at);
  const isPaused = instance.paused_at !== null;

  // Response status
  const responseMinutesRemaining = Math.round(
    (responseDue.getTime() - now.getTime()) / 60000,
  );
  let responseStatus: SlaStatus;
  if (instance.responded_at) {
    responseStatus =
      new Date(instance.responded_at) <= responseDue ? "met" : "breached";
  } else if (responseDue < now) {
    responseStatus = "breached";
  } else {
    responseStatus = "pending";
  }

  // Resolution status
  let resolutionStatus: SlaDisplayStatus;
  let resolutionMinutesRemaining: number;

  const isTerminal = ticketStatus === "resolved" || ticketStatus === "closed";

  if (isTerminal) {
    const refTime = resolvedAt ? new Date(resolvedAt) : now;
    resolutionMinutesRemaining = Math.round(
      (resolutionDue.getTime() - refTime.getTime()) / 60000,
    );
    resolutionStatus = resolutionMinutesRemaining >= 0 ? "met" : "breached";
  } else {
    resolutionMinutesRemaining = Math.round(
      (resolutionDue.getTime() - now.getTime()) / 60000,
    );
    if (resolutionMinutesRemaining < 0) {
      resolutionStatus = "breached";
    } else if (resolutionMinutesRemaining <= 60) {
      resolutionStatus = "at_risk";
    } else {
      resolutionStatus = "on_track";
    }
  }

  return {
    responseStatus,
    resolutionStatus,
    responseMinutesRemaining,
    resolutionMinutesRemaining,
    responseDueAt: instance.response_due_at,
    resolutionDueAt: instance.resolution_due_at,
    respondedAt: instance.responded_at,
    isPaused,
  };
}

export function formatSlaCountdown(minutesRemaining: number): string {
  if (minutesRemaining < 0) {
    return `${formatSlaMinutes(Math.abs(minutesRemaining))} overdue`;
  }
  return `${formatSlaMinutes(minutesRemaining)} left`;
}

export function computeElapsedMinutes(
  createdAt: string,
  endAt?: string | null,
  now: Date = new Date(),
): number {
  const start = new Date(createdAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : now.getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export function formatSlaMinutes(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
