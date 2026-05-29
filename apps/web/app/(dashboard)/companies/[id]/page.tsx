import { api } from "@/lib/api-client";
import { notFound } from "next/navigation";
import type { CompanyDetail, CompanyHealthStatus } from "@/types/company.types";
import { CompanyDetailHeader } from "./_components/company-detail-header";
import { CompanyHealthPanel } from "./_components/company-health-panel";
import { CompanyContactsPanel } from "./_components/company-contacts-panel";
import { CompanyTickets } from "./_components/company-tickets";
import { CompanyProjects } from "./_components/company-projects";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [detailRes, statusesRes] = await Promise.allSettled([
    api.get<CompanyDetail>(`/companies/${id}/detail`),
    api.get<CompanyHealthStatus[]>("/lookup/company-health-statuses"),
  ]);

  if (detailRes.status === "rejected" || !detailRes.value) {
    notFound();
  }

  const company = detailRes.value;
  const healthStatuses =
    statusesRes.status === "fulfilled" ? statusesRes.value : [];

  return (
    <div className="space-y-6">
      <CompanyDetailHeader company={company} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CompanyContactsPanel
            companyId={company.id}
            initialContacts={company.contacts}
          />
          <CompanyTickets
            openTickets={company.openTickets}
            closedTickets={company.closedTickets}
          />
          <CompanyProjects projects={company.projects} />
        </div>
        <div>
          <CompanyHealthPanel
            companyId={company.id}
            currentStatus={company.healthStatus}
            healthNote={company.health_note ?? null}
            healthUpdatedAt={company.health_updated_at ?? null}
            healthStatuses={healthStatuses}
            initialHistory={company.healthHistory}
          />
        </div>
      </div>
    </div>
  );
}
