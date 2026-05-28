import Link from "next/link";
import { FolderKanban, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamDetail } from "@/types/team.types";

interface TeamActiveProjectsProps {
  projects: TeamDetail["activeProjects"];
}

const METHODOLOGY_COLORS: Record<string, string> = {
  scrum:     "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  kanban:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  waterfall: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export function TeamActiveProjects({ projects }: TeamActiveProjectsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-gray-400" />
          Active Projects
          {projects.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {projects.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {projects.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-gray-400">
            No active projects
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-800">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.key}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {project.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${METHODOLOGY_COLORS[project.methodology] ?? ""}`}
                    >
                      {project.methodology}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
