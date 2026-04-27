import { Badge } from "@/components/ui/badge";
import { ClientTemperature } from "@/types/ticket.types";

interface TemperatureBadgeProps {
  temperature: ClientTemperature;
  showLabel?: boolean;
}

const temperatureConfig: Record<
  ClientTemperature,
  { label: string; emoji: string; className: string }
> = {
  hot: {
    label: "Hot",
    emoji: "🔴",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  warm: {
    label: "Warm",
    emoji: "🟡",
    className:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
  cool: {
    label: "Good",
    emoji: "🟢",
    className:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
};

export function TemperatureBadge({
  temperature,
  showLabel = true,
}: TemperatureBadgeProps) {
  const config = temperatureConfig[temperature];

  if (!showLabel) {
    return <span title={config.label}>{config.emoji}</span>;
  }

  return (
    <Badge className={config.className}>
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </Badge>
  );
}
