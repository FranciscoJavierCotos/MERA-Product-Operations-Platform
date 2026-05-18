import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brain, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import {
  getCollections,
  getDocuments,
  getKnowledgeKpis,
  getRecentAudit,
  getResolutionRows,
  getRetrievalConfig,
  getTags,
} from "@/lib/supabase/queries/knowledge";
import { KnowledgePageClient } from "./knowledge-page-client";

export const dynamic = "force-dynamic";

export default async function KnowledgeCenterPage() {
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

  const role = (profile?.role ?? "client") as
    | "admin"
    | "support_lead"
    | "support_member"
    | "client";

  if (!["admin", "support_lead", "support_member"].includes(role)) {
    redirect("/dashboard");
  }

  const isAdmin = role === "admin";

  const [kpis, resolutions, documents, collections, tags, config, audit] =
    await Promise.all([
      getKnowledgeKpis(supabase),
      getResolutionRows(supabase),
      getDocuments(supabase),
      getCollections(supabase),
      getTags(supabase),
      getRetrievalConfig(supabase),
      isAdmin ? getRecentAudit(supabase, 30) : Promise.resolve([]),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="h-8 w-8 text-indigo-600" />
            AI Knowledge Center
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Centralized management for every knowledge source the AI can draw on.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Brain className="h-5 w-5 text-indigo-600" />}
          label="Resolutions indexed"
          value={kpis.resolutions_indexed.toLocaleString()}
          sub={
            kpis.resolutions_disabled > 0
              ? `${kpis.resolutions_disabled} disabled`
              : "All available to AI"
          }
        />
        <KpiCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          label="Document chunks"
          value={kpis.document_chunks.toLocaleString()}
          sub={`${kpis.documents_ready} active documents`}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          label="Ingestion queue"
          value={`${kpis.versions_pending} pending`}
          sub={
            kpis.versions_failed > 0
              ? `${kpis.versions_failed} failed`
              : "No failures"
          }
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          label="Retrievals (7d)"
          value={kpis.retrievals_7d.toLocaleString()}
          sub={
            kpis.top_source_7d
              ? `Top: ${kpis.top_source_7d.title}`
              : "No retrievals yet"
          }
        />
      </div>

      <KnowledgePageClient
        isAdmin={isAdmin}
        resolutions={resolutions}
        documents={documents}
        collections={collections}
        tags={tags}
        retrievalConfig={config}
        auditLog={audit}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}
