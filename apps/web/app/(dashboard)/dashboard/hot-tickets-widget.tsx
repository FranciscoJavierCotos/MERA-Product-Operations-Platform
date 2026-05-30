import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, CheckCircle2 } from "lucide-react";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatTicketNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface HotTicket {
  id: string;
  ticket_number: number;
  title: string;
  created_at: string;
  priority?: { id: number; name: string; label: string; color_class: string; display_order: number } | null;
  company?: { id: string; name: string } | null;
}

function daysOpen(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export async function HotTicketsWidget() {
  const tickets = await api.get<HotTicket[]>("/dashboard/hot-tickets");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-orange-500 shrink-0" />
          <span>Hot Client Tickets</span>
          {tickets.length > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
              {tickets.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {tickets.length === 0 ? (
          <EmptyState message="No hot client tickets" />
        ) : (
          <div className="space-y-0.5">
            {tickets.map((ticket) => {
              const age = daysOpen(ticket.created_at);
              const isOld = age > 5;
              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                        {formatTicketNumber(ticket.ticket_number)}
                      </span>
                      <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.title}
                      </span>
                    </div>
                    {ticket.company && (
                      <span className="text-xs text-muted-foreground truncate pl-[calc(theme(spacing.5)+0.5rem)]">
                        {ticket.company.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.priority && <PriorityBadge priority={ticket.priority} />}
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        isOld
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {age === 0 ? "today" : `${age}d`}
                    </span>
                  </div>
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
