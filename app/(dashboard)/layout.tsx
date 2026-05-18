import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
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
      <div className="min-h-screen bg-gray-100">
        <Sidebar role={displayProfile.role} />
        <div className="md:pl-64 flex flex-col flex-1">
          <Navbar user={displayProfile} />
          <main className="flex-1">
            <div className="py-6">
              <div className="w-full px-4 sm:px-6 lg:px-8">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </UnsavedChangesProvider>
  );
}
