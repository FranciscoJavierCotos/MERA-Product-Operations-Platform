export type SlaStatus = "pending" | "met" | "breached";
export type SlaDisplayStatus = "on_track" | "at_risk" | "breached" | "met";

export interface SlaPolicy {
  id: string;
  name: string;
  priority_id: number;
  response_time_minutes: number;
  resolution_time_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaInstance {
  id: string;
  ticket_id: string;
  policy_id: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at: string | null;
  paused_at: string | null;
  total_paused_minutes: number;
  created_at: string;
  updated_at: string;
  policy?: SlaPolicy;
}

export interface SlaDisplayInfo {
  responseStatus: SlaStatus;
  resolutionStatus: SlaDisplayStatus;
  responseMinutesRemaining: number;
  resolutionMinutesRemaining: number;
  responseDueAt: string;
  resolutionDueAt: string;
  respondedAt: string | null;
  isPaused: boolean;
}

export interface SlaStats {
  breached: number;
  due1h: number;
  due4h: number;
  onTrack: number;
}
