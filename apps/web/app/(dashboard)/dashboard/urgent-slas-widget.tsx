import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { formatTicketNumber } from "@/lib/utils/format";
import { computeSlaDisplayInfo, formatSlaCountdown } from "@/lib/utils/sla";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

export async function UrgentSlasWidget() {
  const urgentTickets = await api.get<any[]>("/sla/most-urgent");

  const breachedCount = urgentTickets.filter((row: any) => {
    const info = computeSlaDisplayInfo(row, row.ticket?.status, null);
    return info.resolutionMinutesRemaining < 0;
  }).length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
          <span>Urgent SLAs</span>
          {urgentTickets.length > 0 && (
            <span
              className={cn(
                "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
                breachedCount > 0
                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
              )}
            >
              {urgentTickets.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {urgentTickets.length === 0 ? (
          <EmptyState message="All SLAs on track" />
        ) : (
          <div className="space-y-0.5">
            {urgentTickets.map((row: any) => {
              const ticket = row.ticket;
              if (!ticket) return null;

              const info = computeSlaDisplayInfo(row, ticket.status, null);
              const isBreached = info.resolutionMinutesRemaining < 0;
              const isAtRisk = !isBreached && info.resolutionMinutesRemaining <= 60;

              return (
                <Link
                  key={row.ticket_id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "shrink-0 h-1.5 w-1.5 rounded-full",
                        isBreached ? "bg-red-500" : isAtRisk ? "bg-amber-500" : "bg-yellow-400",
                      )}
                    />
                    <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                      {formatTicketNumber(ticket.ticket_number)}
                    </span>
                    <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {ticket.title}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold shrink-0 tabular-nums",
                      isBreached
                        ? "text-red-600 dark:text-red-400"
                        : isAtRisk
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-yellow-600 dark:text-yellow-400",
                    )}
                  >
                    {formatSlaCountdown(info.resolutionMinutesRemaining)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-emerald-600 dark:text-emerald-500">
      <CheckCircle2 className="h-8 w-8 opacity-80" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
