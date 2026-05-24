import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api-client";
import type { TaskWithRelations, TaskStats } from "@/types/task.types";
import type { Profile } from "@/types/user.types";
import { TasksPageClient } from "./tasks-page-client";

interface TasksPageProps {
  searchParams: Promise<{
    create?: string;
  }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const userId = user.id;
  const params = await searchParams;
  const initialCreateOpen = params.create === "1";

  // Fetch initial data server-side
  const [tasks, stats, users] = await Promise.all([
    api.get<TaskWithRelations[]>("/tasks/me"),
    api.get<TaskStats>("/tasks/stats"),
    api.get<Profile[]>("/users/support"),
  ]);

  return (
    <TasksPageClient
      initialTasks={tasks || []}
      initialStats={stats}
      users={users || []}
      currentUserId={userId}
      initialCreateOpen={initialCreateOpen}
    />
  );
}
