import type { Ticket } from "@/types/ticket.types";

function toMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 0;
  return ms;
}

export const DEFAULT_CREATED_AT_TIE_TOLERANCE_MS = 2000;

interface SortTicketsOptions {
  createdAtTieToleranceMs?: number;
}

export function sortTicketsForList<
  T extends Pick<Ticket, "created_at" | "ticket_number">,
>(tickets: T[], options: SortTicketsOptions = {}): T[] {
  const createdAtTieToleranceMs =
    options.createdAtTieToleranceMs ?? DEFAULT_CREATED_AT_TIE_TOLERANCE_MS;

  return [...tickets].sort((a, b) => {
    const msA = toMs(a.created_at);
    const msB = toMs(b.created_at);

    const diffMs = msB - msA;

    if (Math.abs(diffMs) > createdAtTieToleranceMs) {
      return diffMs;
    }

    if (a.ticket_number !== b.ticket_number) {
      return b.ticket_number - a.ticket_number;
    }

    if (msA !== msB) return msB - msA;

    return 0;
  });
}
