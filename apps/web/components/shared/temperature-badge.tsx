import { Badge } from "@/components/ui/badge";
import type { TicketTemperatureRow } from "@/types/ticket.types";

interface TemperatureBadgeProps {
  temperature: TicketTemperatureRow | null | undefined;
  showLabel?: boolean;
}

export function TemperatureBadge({
  temperature,
  showLabel = true,
}: TemperatureBadgeProps) {
  if (!temperature) return null;

  if (!showLabel) {
    return <span title={temperature.label}>{temperature.emoji}</span>;
  }

  return (
    <Badge className={temperature.color_class}>
      <span className="mr-1">{temperature.emoji}</span>
      {temperature.label}
    </Badge>
  );
}
