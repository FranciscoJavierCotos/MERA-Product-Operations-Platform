import { Badge } from "@/components/ui/badge";
import { ClientTemperature } from "@/types/ticket.types";

interface TemperatureBadgeProps {
  temperature: ClientTemperature;
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
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  cool: {
    label: "Good",
    emoji: "🟢",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
};

export function TemperatureBadge({ temperature }: TemperatureBadgeProps) {
  const config = temperatureConfig[temperature];

  return (
    <Badge className={config.className}>
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </Badge>
  );
}
