import { api } from "@/lib/api-client";
import type { Company } from "@/types/company.types";
import type { Profile } from "@/types/user.types";
import { Building2 } from "lucide-react";
import { CompaniesListClient } from "./_components/companies-list-client";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const [companiesRes, profilesRes] = await Promise.allSettled([
    api.get<Company[]>("/companies"),
    api.get<Profile[]>("/users"),
  ]);

  const companies =
    companiesRes.status === "fulfilled" ? companiesRes.value : [];
  const profiles =
    profilesRes.status === "fulfilled" ? profilesRes.value : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-gray-500" />
          Companies
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Client companies — contacts, tickets, project features, and account
          health.
        </p>
      </header>

      <CompaniesListClient initialCompanies={companies} profiles={profiles} />
    </div>
  );
}
