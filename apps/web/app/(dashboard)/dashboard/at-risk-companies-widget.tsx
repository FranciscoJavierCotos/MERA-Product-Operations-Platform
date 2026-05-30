import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface AtRiskCompany {
  id: string;
  name: string;
  logo_url?: string | null;
  health_status_id: number;
  healthStatus?: {
    id: number;
    name: string;
    label: string;
    emoji: string;
    color_class: string;
    level: number;
  } | null;
}

export async function AtRiskCompaniesWidget() {
  const companies = await api.get<AtRiskCompany[]>("/dashboard/at-risk-companies");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Account Health Alerts</span>
          {companies.length > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              {companies.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {companies.length === 0 ? (
          <EmptyState message="All accounts healthy" />
        ) : (
          <div className="space-y-0.5">
            {companies.map((company) => {
              const hs = company.healthStatus;
              const isCritical = hs?.name === "critical";
              return (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "shrink-0 h-1.5 w-1.5 rounded-full",
                        isCritical ? "bg-red-500" : "bg-orange-400",
                      )}
                    />
                    <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {company.name}
                    </span>
                  </div>
                  {hs && (
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                        hs.color_class,
                      )}
                    >
                      {hs.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-emerald-600 dark:text-emerald-500">
      <CheckCircle2 className="h-8 w-8 opacity-80" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
