import Link from "next/link";
import { Ticket, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamDetail, TeamType } from "@/types/team.types";

interface TeamRecentTicketsProps {
  tickets: TeamDetail["recentTickets"];
  teamType: TeamType | null;
}

const STATUS_COLORS: Record<string, string> = {
  new:              "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  pending_customer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  pending_internal: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  escalated:        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  resolved:         "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed:           "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    "text-gray-500",
  medium: "text-blue-600 dark:text-blue-400",
  high:   "text-orange-600 dark:text-orange-400",
  urgent: "text-red-600 dark:text-red-400",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TeamRecentTickets({
  tickets,
  teamType,
}: TeamRecentTicketsProps) {
  // Only show for support/department teams (not pure engineering)
  const showSection = teamType !== "engineering";

  if (!showSection) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ticket className="h-4 w-4 text-gray-400" />
          Recent Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-gray-400">
            No recent tickets
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-800">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">
                      #{ticket.ticket_number}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                      {ticket.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className={`inline-block text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {formatStatus(ticket.status)}
                      </span>
                      <span
                        className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority] ?? "text-gray-500"}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary mt-1 ml-2 flex-shrink-0 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
