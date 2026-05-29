// ── Client Companies (CRM — migration 037) ──────────────────────────────────

export type CompanyHealthName =
  | "critical"
  | "at_risk"
  | "neutral"
  | "healthy"
  | "thriving";

// ── Health status lookup ────────────────────────────────────────────────────

export interface CompanyHealthStatus {
  id: number;
  name: CompanyHealthName | string;
  label: string;
  color_class: string;
  emoji: string;
  level: number; // 1..5 — drives the meter fill
  display_order: number;
}

// ── Company ─────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
  health_status_id: number;
  health_note?: string | null;
  health_updated_at?: string | null;
  health_updated_by?: string | null;
  account_owner_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  healthStatus?: CompanyHealthStatus | null;
  account_owner?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  contact_count?: number;
}

// ── Company contact (standalone CRM record) ─────────────────────────────────

export interface CompanyContact {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  title?: string | null;
  phone?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// ── Health history entry ────────────────────────────────────────────────────

export interface CompanyHealthHistoryEntry {
  id: string;
  company_id: string;
  from_status_id?: number | null;
  to_status_id: number;
  note?: string | null;
  changed_by?: string | null;
  changed_at: string;
  // Joined relations
  from_status?: CompanyHealthStatus | null;
  to_status?: CompanyHealthStatus | null;
  changed_by_user?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

// ── Aggregated views used by the detail page ────────────────────────────────

export interface CompanyTicketSummary {
  id: string;
  ticket_number: number;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  is_final: boolean;
  created_at: string;
}

export interface CompanyProjectSummary {
  id: string;
  name: string;
  key: string;
  methodology: string;
  status: string;
  features: Array<{
    id: string;
    item_key: string;
    title: string;
    type: string;
    status: string;
  }>;
}

export interface CompanyDetail extends Company {
  healthStatus: CompanyHealthStatus | null;
  contacts: CompanyContact[];
  healthHistory: CompanyHealthHistoryEntry[];
  openTickets: CompanyTicketSummary[];
  closedTickets: CompanyTicketSummary[];
  projects: CompanyProjectSummary[];
  stats: {
    contactCount: number;
    openTicketCount: number;
    closedTicketCount: number;
    projectCount: number;
  };
}

// ── Display configuration ────────────────────────────────────────────────────

export const HEALTH_STATUS_CONFIG: Record<
  CompanyHealthName,
  { label: string; emoji: string; level: number; color: string }
> = {
  critical: { label: "Critical", emoji: "🔴", level: 1, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  at_risk:  { label: "At Risk",  emoji: "🟠", level: 2, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  neutral:  { label: "Neutral",  emoji: "🟡", level: 3, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  healthy:  { label: "Healthy",  emoji: "🟢", level: 4, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  thriving: { label: "Thriving", emoji: "🌟", level: 5, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

export const HEALTH_SENTIMENT = {
  healthy: ["thriving", "healthy"] as CompanyHealthName[],
  neutral: ["neutral"] as CompanyHealthName[],
  attention: ["at_risk", "critical"] as CompanyHealthName[],
};

// ── Helper functions ──────────────────────────────────────────────────────────

export function getHealthConfig(name: string | undefined | null) {
  if (name && name in HEALTH_STATUS_CONFIG) {
    return HEALTH_STATUS_CONFIG[name as CompanyHealthName];
  }
  return HEALTH_STATUS_CONFIG.neutral;
}

export function healthSentiment(
  name: string | undefined | null,
): "healthy" | "neutral" | "attention" {
  if (name && HEALTH_SENTIMENT.healthy.includes(name as CompanyHealthName)) return "healthy";
  if (name && HEALTH_SENTIMENT.attention.includes(name as CompanyHealthName)) return "attention";
  return "neutral";
}
