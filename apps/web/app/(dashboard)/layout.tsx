import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { api } from "@/lib/api-client";
import type { Profile } from "@/types/user.types";
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

  let profile: Profile | null = null;
  try {
    profile = await api.get<Profile | null>(`/users/${user.id}`);
  } catch {
    // Gracefully degrade when the API is unavailable or rate-limited.
    // The fallback below builds a minimal profile from the auth session.
  }

  // If no profile exists (or the API call failed), fall back to auth user data
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
