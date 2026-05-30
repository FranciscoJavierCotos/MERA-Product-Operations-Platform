/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";

export { getSlaStats, getMostUrgentSlaTickets } from "./slas";

type AnyClient = unknown;

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  myTasks: number;
  resolvedToday: number;
  breachedSlas: number;
  atRiskCompanies: number;
  hotTickets: number;
}

/** @deprecated */
export async function getDashboardStats(
  _sb: AnyClient,
  _userId: string,
): Promise<DashboardStats> {
  return apiBrowser.get<DashboardStats>("/dashboard/stats");
}

/** @deprecated */
export async function getRecentTickets(_sb: AnyClient, limit: number = 10) {
  return apiBrowser.get<unknown[]>("/dashboard/recent-tickets", { limit });
}
