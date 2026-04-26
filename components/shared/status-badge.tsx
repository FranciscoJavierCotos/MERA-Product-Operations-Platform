import { Badge } from "@/components/ui/badge";
import { TicketStatus } from "@/types/ticket.types";

interface StatusBadgeProps {
  status: TicketStatus | string | null | undefined;
}

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  new: { label: "New", variant: "default" },
  pending_customer: { label: "Pending Customer Side", variant: "secondary" },
  pending_internal: { label: "Pending Our Side", variant: "secondary" },
  escalated: { label: "Escalated", variant: "secondary" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "secondary" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = typeof status === "string" ? status : "";
  const config = statusConfig[normalizedStatus as TicketStatus];

  const fallbackLabel =
    typeof status === "string" && status.length > 0
      ? status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Unknown";

  return (
    <Badge
      variant={config?.variant ?? "secondary"}
      className="whitespace-nowrap"
    >
      {config?.label ?? fallbackLabel}
    </Badge>
  );
}
