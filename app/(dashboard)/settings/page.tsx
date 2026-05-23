import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/supabase/queries/users";
import { getTeams } from "@/lib/supabase/queries/teams";
import {
  getTicketStatuses,
  getTicketPriorities,
  getTicketCategories,
  getTags,
} from "@/lib/supabase/queries/lookup";
import { getAllSlaPolicies } from "@/lib/supabase/queries/slas";
import { SettingsTabs } from "./_components/settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") redirect("/dashboard");

  const [profiles, teams, statuses, priorities, categories, tags, slaPolicies] =
    await Promise.all([
      getAllProfiles(supabase),
      getTeams(supabase),
      getTicketStatuses(supabase),
      getTicketPriorities(supabase),
      getTicketCategories(supabase),
      getTags(supabase),
      getAllSlaPolicies(supabase),
    ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage users, teams, ticket configurations, tags, and SLA policies.
        </p>
      </div>
      <SettingsTabs
        profiles={profiles}
        teams={teams}
        statuses={statuses}
        priorities={priorities}
        categories={categories}
        tags={tags}
        slaPolicies={slaPolicies}
      />
    </div>
  );
}
