import Link from "next/link";
import { Ticket, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CompanyTicketSummary } from "@/types/company.types";

interface CompanyTicketsProps {
  openTickets: CompanyTicketSummary[];
  closedTickets: CompanyTicketSummary[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-600 dark:text-blue-400",
  high: "text-orange-600 dark:text-orange-400",
  urgent: "text-red-600 dark:text-red-400",
};

const UNCATEGORIZED = "Uncategorized";

function groupByCategory(tickets: CompanyTicketSummary[]) {
  const groups = new Map<string, CompanyTicketSummary[]>();
  for (const t of tickets) {
    const key = t.category ?? UNCATEGORIZED;
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function TicketRow({ ticket }: { ticket: CompanyTicketSummary }) {
  return (
    <li>
      <Link
        href={`/tickets/${ticket.id}`}
        className="flex items-start justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group rounded-md"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1 leading-snug">
            <span className="text-xs text-gray-400 mr-1.5">#{ticket.ticket_number}</span>
            {ticket.title}
          </p>
        </div>
        <span
          className={`text-xs font-medium ml-2 flex-shrink-0 ${PRIORITY_COLORS[ticket.priority] ?? "text-gray-500"}`}
        >
          {ticket.priority}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary ml-1 flex-shrink-0 transition-colors" />
      </Link>
    </li>
  );
}

function GroupedTickets({ tickets }: { tickets: CompanyTicketSummary[] }) {
  if (tickets.length === 0) {
    return (
      <div className="px-6 py-6 text-center text-sm text-gray-400">
        No tickets
      </div>
    );
  }
  const grouped = groupByCategory(tickets);
  return (
    <div className="space-y-4 px-2 py-2">
      {grouped.map(([category, items]) => (
        <div key={category}>
          <h4 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            {category}
            <span className="ml-1.5 text-gray-400">({items.length})</span>
          </h4>
          <ul className="space-y-0.5">
            {items.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CompanyTickets({ openTickets, closedTickets }: CompanyTicketsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ticket className="h-4 w-4 text-gray-400" />
          Tickets (Inquiries)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <Tabs defaultValue="open">
          <TabsList className="ml-2">
            <TabsTrigger value="open" className="gap-1.5">
              Open
              <Badge variant="secondary" className="ml-1">{openTickets.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-1.5">
              Closed
              <Badge variant="secondary" className="ml-1">{closedTickets.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="open">
            <GroupedTickets tickets={openTickets} />
          </TabsContent>
          <TabsContent value="closed">
            <GroupedTickets tickets={closedTickets} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
