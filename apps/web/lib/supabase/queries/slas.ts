/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type { SlaInstance, SlaPolicy, SlaStats } from "@/types/sla.types";

type AnyClient = unknown;

export interface SlaPolicyTargets {
  response_time_minutes: number;
  resolution_time_minutes: number;
}

export type SlaPolicyTargetsByPriorityId = Partial<Record<number, SlaPolicyTargets>>;

/** @deprecated */
export async function getSlaInstance(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<SlaInstance | null>(`/sla/instances/${ticketId}`);
}

/** @deprecated */
export async function getActiveSlaPolicyTargetsByPriorityId(_sb: AnyClient) {
  return apiBrowser.get<SlaPolicyTargetsByPriorityId>("/sla/policy-targets");
}

/** @deprecated */
export async function getSlaStats(_sb: AnyClient) {
  return apiBrowser.get<SlaStats>("/sla/stats");
}

/** @deprecated */
export async function getAllSlaPolicies(_sb: AnyClient) {
  return apiBrowser.get<SlaPolicy[]>("/sla/policies");
}

/** @deprecated */
export async function createSlaPolicy(_sb: AnyClient, input: Partial<SlaPolicy>) {
  return apiBrowser.post<SlaPolicy>("/sla/policies", input);
}

/** @deprecated */
export async function updateSlaPolicy(
  _sb: AnyClient,
  id: string,
  updates: Partial<SlaPolicy>,
) {
  return apiBrowser.patch<SlaPolicy>(`/sla/policies/${id}`, updates);
}

/** @deprecated */
export async function deleteSlaPolicy(_sb: AnyClient, id: string) {
  await apiBrowser.del(`/sla/policies/${id}`);
}

/** @deprecated */
export async function getMostUrgentSlaTickets(_sb: AnyClient, _limit?: number) {
  return apiBrowser.get<unknown[]>("/sla/most-urgent");
}
