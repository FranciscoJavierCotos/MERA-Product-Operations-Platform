import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getProfile } from "@/lib/supabase/queries/users";
import { UnsavedChangesProvider } from "@/lib/contexts/unsaved-changes-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  // If no profile exists, create a temporary one from user data
  const displayProfile = profile || {
    id: user.id,
    email: user.email!,
    full_name: user.user_metadata?.full_name || user.email!,
    role: "support_member" as const,
    avatar_url: undefined,
    team_id: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <UnsavedChangesProvider>
      <DashboardShell user={displayProfile}>{children}</DashboardShell>
    </UnsavedChangesProvider>
  );
}
