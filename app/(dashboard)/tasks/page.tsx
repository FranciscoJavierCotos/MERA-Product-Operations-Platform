import { createClient } from "@/lib/supabase/server";
import { getMyTasks, getTaskStats } from "@/lib/supabase/queries/tasks";
import { getSupportMembers } from "@/lib/supabase/queries/users";
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
    getMyTasks(supabase, userId),
    getTaskStats(supabase, userId),
    getSupportMembers(supabase),
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
