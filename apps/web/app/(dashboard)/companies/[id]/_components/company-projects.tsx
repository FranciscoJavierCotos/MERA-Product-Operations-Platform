import Link from "next/link";
import { FolderKanban, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CompanyProjectSummary } from "@/types/company.types";

interface CompanyProjectsProps {
  projects: CompanyProjectSummary[];
}

const METHODOLOGY_COLORS: Record<string, string> = {
  scrum: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  kanban: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  waterfall: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const TYPE_COLORS: Record<string, string> = {
  epic: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  story: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  task: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  bug: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function CompanyProjects({ projects }: CompanyProjectsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-gray-400" />
          Project Features
          {projects.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{projects.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {projects.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-gray-400">
            No projects linked to this company
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-800">
            {projects.map((project) => (
              <li key={project.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/projects/${project.key}`}
                    className="flex items-center gap-2 min-w-0 flex-1 group"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {project.name}
                    </span>
                    <span className="text-xs text-gray-400">{project.key}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </Link>
                  <Badge
                    variant="outline"
                    className={`text-xs ${METHODOLOGY_COLORS[project.methodology] ?? ""}`}
                  >
                    {project.methodology}
                  </Badge>
                </div>

                {project.features.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-1">
                    {project.features.slice(0, 8).map((f) => (
                      <li key={f.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded px-1 py-0.5 font-medium ${TYPE_COLORS[f.type] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {f.item_key}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 truncate">
                          {f.title}
                        </span>
                      </li>
                    ))}
                    {project.features.length > 8 && (
                      <li className="text-xs text-gray-400 pl-1">
                        +{project.features.length - 8} more
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
