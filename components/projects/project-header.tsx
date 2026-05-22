"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { Project } from "@/types/project.types";

const TABS: Array<{ label: string; href: (k: string) => string; match: (p: string, k: string) => boolean }> = [
  { label: "Board",    href: (k) => `/projects/${k}`,           match: (p, k) => p === `/projects/${k}` },
  { label: "Backlog",  href: (k) => `/projects/${k}/backlog`,   match: (p, k) => p.startsWith(`/projects/${k}/backlog`) },
  { label: "Sprints",  href: (k) => `/projects/${k}/sprints`,   match: (p, k) => p.startsWith(`/projects/${k}/sprints`) },
  { label: "Settings", href: (k) => `/projects/${k}/settings`,  match: (p, k) => p.startsWith(`/projects/${k}/settings`) },
];

export function ProjectHeader({ project }: { project: Project }) {
  const pathname = usePathname();
  const showScrumTabs = project.methodology === "scrum";

  return (
    <div className="border-b border-gray-200 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">{project.key}</Badge>
          <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
          <span className="text-xs text-gray-500 capitalize">{project.methodology}</span>
          {project.status === "archived" && (
            <Badge className="bg-gray-200 text-gray-700">archived</Badge>
          )}
        </div>
      </div>

      <nav className="mt-3 flex gap-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname, project.key);
          const isScrumTab = tab.label === "Board" || tab.label === "Backlog" || tab.label === "Sprints";
          const disabled = !showScrumTabs && isScrumTab;
          if (disabled) {
            return (
              <span
                key={tab.label}
                className="text-sm py-2 text-gray-300 cursor-not-allowed"
                title={`${project.methodology} workflow — coming soon`}
              >
                {tab.label}
              </span>
            );
          }
          return (
            <Link
              key={tab.label}
              href={tab.href(project.key)}
              className={cn(
                "text-sm py-2 border-b-2 -mb-2 transition-colors",
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
