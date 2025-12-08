"use client";

import { Badge } from "@/components/ui/badge";
import { SupportLevel, SUPPORT_LEVEL_CONFIG } from "@/types/team.types";

interface SupportLevelBadgeProps {
  level: SupportLevel;
  showDescription?: boolean;
}

export function SupportLevelBadge({
  level,
  showDescription = false,
}: SupportLevelBadgeProps) {
  const config = SUPPORT_LEVEL_CONFIG[level];

  return (
    <Badge variant="secondary" className={`whitespace-nowrap ${config.color}`}>
      {config.label}
      {showDescription && ` - ${config.description}`}
    </Badge>
  );
}
