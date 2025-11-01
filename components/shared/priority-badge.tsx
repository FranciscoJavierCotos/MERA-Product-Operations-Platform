import { Badge } from "@/components/ui/badge";
import { TicketPriority } from "@/types/ticket.types";

interface PriorityBadgeProps {
  priority: TicketPriority;
}

const priorityConfig: Record<
  TicketPriority,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return <Badge className={config.className}>{config.label}</Badge>;
}
