import { Badge } from "@/components/ui/badge";
import type { SprintStatus } from "@/types/sprint.types";

const STYLE: Record<SprintStatus, { className: string; label: string }> = {
  planned:   { className: "bg-gray-100 text-gray-800 hover:bg-gray-100",       label: "Planned"   },
  active:    { className: "bg-blue-100 text-blue-800 hover:bg-blue-100",       label: "Active"    },
  completed: { className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100", label: "Completed" },
};

export function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const cfg = STYLE[status];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
