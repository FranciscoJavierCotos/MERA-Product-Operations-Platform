import { Badge } from "@/components/ui/badge";
import type { TicketStatusRow } from "@/types/ticket.types";

interface StatusBadgeProps {
  status: TicketStatusRow | null | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) {
    return <Badge variant="secondary" className="whitespace-nowrap">Unknown</Badge>;
  }

  return (
    <Badge
      variant={status.badge_variant as "default" | "secondary" | "destructive" | "outline"}
      className="whitespace-nowrap"
    >
      {status.label}
    </Badge>
  );
}
