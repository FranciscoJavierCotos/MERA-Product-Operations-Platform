import { Badge } from "@/components/ui/badge";
import type { TicketPriorityRow } from "@/types/ticket.types";

interface PriorityBadgeProps {
  priority: TicketPriorityRow | null | undefined;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (!priority) {
    return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unknown</Badge>;
  }

  return <Badge className={priority.color_class}>{priority.label}</Badge>;
}
