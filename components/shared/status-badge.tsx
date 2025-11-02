import { Badge } from "@/components/ui/badge";
import { TicketStatus } from "@/types/ticket.types";

interface StatusBadgeProps {
  status: TicketStatus;
}

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  new: { label: "New", variant: "default" },
  pending_customer: { label: "Pending Customer Side", variant: "outline" },
  pending_internal: { label: "Pending Our Side", variant: "secondary" },
  escalated: { label: "Escalated", variant: "destructive" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="whitespace-nowrap">
      {config.label}
    </Badge>
  );
}
