import { Badge } from "@/components/ui/badge";
import { Bug, BookOpen, CheckSquare, Layers } from "lucide-react";
import type { WorkItemType } from "@/types/work-item.types";

const STYLE: Record<WorkItemType, { className: string; icon: typeof Bug; label: string }> = {
  epic:    { className: "bg-purple-100 text-purple-800 hover:bg-purple-100", icon: Layers,     label: "Epic"  },
  story:   { className: "bg-green-100 text-green-800 hover:bg-green-100",   icon: BookOpen,   label: "Story" },
  task:    { className: "bg-blue-100 text-blue-800 hover:bg-blue-100",      icon: CheckSquare, label: "Task" },
  bug:     { className: "bg-red-100 text-red-800 hover:bg-red-100",         icon: Bug,        label: "Bug"   },
};

export function WorkItemTypeBadge({ type }: { type: WorkItemType }) {
  const cfg = STYLE[type];
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
