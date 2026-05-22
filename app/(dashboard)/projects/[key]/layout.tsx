import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectByKey } from "@/lib/supabase/queries/projects";
import { ProjectHeader } from "@/components/projects/project-header";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { key } = await params;
  const supabase = await createClient();
  const project = await getProjectByKey(supabase, key);
  if (!project) notFound();

  return (
    <div className="space-y-4">
      <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
        ← All projects
      </Link>
      <ProjectHeader project={project} />
      {children}
    </div>
  );
}
