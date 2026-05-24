import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api-client";
import type { Profile } from "@/types/user.types";
import type { Team } from "@/types/team.types";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTagRow,
} from "@/types/ticket.types";
import type { SlaPolicy } from "@/types/sla.types";
import { SettingsTabs } from "./_components/settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await api.get<{ role: string } | null>(`/users/${user.id}`);

  if (profile?.role !== "admin") redirect("/dashboard");

  const [profiles, teams, statuses, priorities, categories, tags, slaPolicies] =
    await Promise.all([
      api.get<Profile[]>("/users"),
      api.get<Team[]>("/teams"),
      api.get<TicketStatusRow[]>("/lookup/statuses"),
      api.get<TicketPriorityRow[]>("/lookup/priorities"),
      api.get<TicketCategoryRow[]>("/lookup/categories"),
      api.get<TicketTagRow[]>("/lookup/tags"),
      api.get<SlaPolicy[]>("/sla/policies"),
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
