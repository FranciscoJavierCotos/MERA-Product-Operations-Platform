"use client";

import { Badge } from "@/components/ui/badge";
import type { TicketSupportLevelRow } from "@/types/ticket.types";

interface SupportLevelBadgeProps {
  level: TicketSupportLevelRow | null | undefined;
  showDescription?: boolean;
}

export function SupportLevelBadge({
  level,
  showDescription = false,
}: SupportLevelBadgeProps) {
  if (!level) return null;

  return (
    <Badge className={`${level.color_class} whitespace-nowrap`}>
      {level.label}
      {showDescription && ` - ${level.description}`}
    </Badge>
  );
}
