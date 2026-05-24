import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { ProjectListItem } from "@/types/project.types";

export function ProjectCard({ project }: { project: ProjectListItem }) {
  return (
    <Link href={`/projects/${project.key}`} className="block">
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono">
              {project.key}
            </Badge>
            <Badge
              className={
                project.status === "active"
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-100"
              }
            >
              {project.status}
            </Badge>
          </div>
          <CardTitle className="text-base mt-2">{project.name}</CardTitle>
          {project.description && (
            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="text-xs text-gray-500 flex items-center justify-between">
          <span className="capitalize">{project.methodology}</span>
          {project.team && <span>{project.team.name}</span>}
        </CardContent>
      </Card>
    </Link>
  );
}
