import {
  Bug,
  Sparkles,
  Settings2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Client-facing option lists for the support portal form.
 *
 * Values are the REAL lookup-table IDs from the MERA schema so the logged
 * payload matches what `POST /tickets` expects — but the labels are written
 * for an external audience. We hard-code them (rather than fetching `/lookup`)
 * because the portal is public/unauthenticated and fully self-contained.
 *
 * category_id mapping (ticket_categories):
 *   1 bug · 2 feature_request · 3 question · 4 configuration_request
 * priority_id mapping (ticket_priorities):
 *   1 low · 2 medium · 3 high · 4 urgent
 */

export interface RequestTypeOption {
  value: number; // category_id
  label: string;
  description: string;
  icon: LucideIcon;
}

export const REQUEST_TYPES: RequestTypeOption[] = [
  {
    value: 1,
    label: "Technical issue",
    description: "Something is broken or not behaving as expected",
    icon: Bug,
  },
  {
    value: 2,
    label: "Feature request",
    description: "Suggest a new capability or improvement",
    icon: Sparkles,
  },
  {
    value: 4,
    label: "Configuration request",
    description: "Changes to setup, access, or environment",
    icon: Settings2,
  },
  {
    value: 3,
    label: "General question",
    description: "Ask us anything about your product or account",
    icon: HelpCircle,
  },
];

export interface PriorityOption {
  value: number; // priority_id
  label: string;
  hint: string;
}

export const PRIORITIES: PriorityOption[] = [
  { value: 1, label: "Low", hint: "Minor — no rush" },
  { value: 2, label: "Medium", hint: "Normal turnaround" },
  { value: 3, label: "High", hint: "Impacting our work" },
  { value: 4, label: "Urgent", hint: "Critical / blocking" },
];

export const DEFAULT_PRIORITY_ID = 2; // medium
export const NEW_STATUS_ID = 1; // "new" — every portal ticket starts here
