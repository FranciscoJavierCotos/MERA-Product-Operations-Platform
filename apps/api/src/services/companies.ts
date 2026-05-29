import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import type {
  Company,
  CompanyContact,
  CompanyDetail,
  CompanyHealthHistoryEntry,
  CompanyHealthStatus,
  CompanyProjectSummary,
  CompanyTicketSummary,
} from "../types/company.types";

type Client = SupabaseClient<Database>;

const COMPANY_SELECT = `
  id, name, description, industry, website, logo_url,
  health_status_id, health_note, health_updated_at, health_updated_by,
  account_owner_id, created_by, created_at, updated_at,
  healthStatus:company_health_statuses!companies_health_status_id_fkey(id, name, label, color_class, emoji, level, display_order),
  account_owner:profiles!companies_account_owner_id_fkey(id, full_name, email, avatar_url)
`;

const CONTACT_SELECT = `
  id, company_id, full_name, email, title, phone, is_primary, created_at, updated_at
`;

// ── Queries ─────────────────────────────────────────────────────────────────

export async function getCompanies(supabase: Client): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .order("name");

  if (error) throw error;
  return (data ?? []) as unknown as Company[];
}

export async function getCompanyById(
  supabase: Client,
  id: string,
): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Company) ?? null;
}

// ── Company detail (aggregated) ───────────────────────────────────────────────

export async function getCompanyDetail(
  supabase: Client,
  id: string,
): Promise<CompanyDetail> {
  const [companyRes, contactsRes, ticketsRes, projectsRes, historyRes] =
    await Promise.all([
      supabase.from("companies").select(COMPANY_SELECT).eq("id", id).single(),
      supabase
        .from("company_contacts")
        .select(CONTACT_SELECT)
        .eq("company_id", id)
        .order("is_primary", { ascending: false })
        .order("full_name"),
      supabase
        .from("tickets")
        .select(
          `id, ticket_number, title, created_at,
           status:ticket_statuses!tickets_status_id_fkey(name, is_final),
           priority:ticket_priorities!tickets_priority_id_fkey(name),
           category:ticket_categories!tickets_category_id_fkey(label)`,
        )
        .eq("company_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select(
          `id, name, key, methodology, status,
           work_items(id, item_key, title, type, status)`,
        )
        .eq("company_id", id)
        .order("name"),
      supabase
        .from("company_health_history")
        .select(
          `id, company_id, from_status_id, to_status_id, note, changed_by, changed_at,
           from_status:company_health_statuses!company_health_history_from_status_id_fkey(id, name, label, color_class, emoji, level, display_order),
           to_status:company_health_statuses!company_health_history_to_status_id_fkey(id, name, label, color_class, emoji, level, display_order),
           changed_by_user:profiles!company_health_history_changed_by_fkey(id, full_name, avatar_url)`,
        )
        .eq("company_id", id)
        .order("changed_at", { ascending: false }),
    ]);

  if (companyRes.error) throw companyRes.error;

  const company = companyRes.data as unknown as Company;

  const contacts = (contactsRes.data ?? []) as unknown as CompanyContact[];

  const allTickets: CompanyTicketSummary[] = (ticketsRes.data ?? []).map(
    (t: any) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      title: t.title,
      status: t.status?.name ?? "",
      priority: t.priority?.name ?? "",
      category: t.category?.label ?? null,
      is_final: t.status?.is_final ?? false,
      created_at: t.created_at,
    }),
  );
  const openTickets = allTickets.filter((t) => !t.is_final);
  const closedTickets = allTickets.filter((t) => t.is_final);

  const projects: CompanyProjectSummary[] = (projectsRes.data ?? []).map(
    (p: any) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      methodology: p.methodology,
      status: p.status,
      features: (p.work_items ?? []).map((w: any) => ({
        id: w.id,
        item_key: w.item_key,
        title: w.title,
        type: w.type,
        status: w.status,
      })),
    }),
  );

  const healthHistory = (historyRes.data ??
    []) as unknown as CompanyHealthHistoryEntry[];

  return {
    ...company,
    healthStatus: company.healthStatus ?? null,
    contacts,
    healthHistory,
    openTickets,
    closedTickets,
    projects,
    stats: {
      contactCount: contacts.length,
      openTicketCount: openTickets.length,
      closedTicketCount: closedTickets.length,
      projectCount: projects.length,
    },
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createCompany(
  supabase: Client,
  input: {
    name: string;
    description?: string | null;
    industry?: string | null;
    website?: string | null;
    logo_url?: string | null;
    health_status_id?: number;
    health_note?: string | null;
    account_owner_id?: string | null;
  },
  userId: string,
): Promise<Company> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("companies") as any)
    .insert([{ ...input, created_by: userId }])
    .select(COMPANY_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as Company;
}

export async function updateCompany(
  supabase: Client,
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    industry: string | null;
    website: string | null;
    logo_url: string | null;
    account_owner_id: string | null;
  }>,
): Promise<Company> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("companies") as any)
    .update(input)
    .eq("id", id)
    .select(COMPANY_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as Company;
}

export async function deleteCompany(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function updateCompanyHealth(
  supabase: Client,
  id: string,
  input: { health_status_id: number; health_note?: string | null },
  userId: string,
): Promise<Company> {
  // The AFTER UPDATE trigger records the change into company_health_history.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("companies") as any)
    .update({
      health_status_id: input.health_status_id,
      health_note: input.health_note ?? null,
      health_updated_by: userId,
      health_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(COMPANY_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as Company;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getCompanyContacts(
  supabase: Client,
  companyId: string,
): Promise<CompanyContact[]> {
  const { data, error } = await supabase
    .from("company_contacts")
    .select(CONTACT_SELECT)
    .eq("company_id", companyId)
    .order("is_primary", { ascending: false })
    .order("full_name");

  if (error) throw error;
  return (data ?? []) as unknown as CompanyContact[];
}

export async function addContact(
  supabase: Client,
  companyId: string,
  input: {
    full_name: string;
    email: string;
    title?: string | null;
    phone?: string | null;
    is_primary?: boolean;
  },
): Promise<CompanyContact> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("company_contacts") as any)
    .insert([{ ...input, company_id: companyId }])
    .select(CONTACT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as CompanyContact;
}

export async function updateContact(
  supabase: Client,
  contactId: string,
  input: Partial<{
    full_name: string;
    email: string;
    title: string | null;
    phone: string | null;
    is_primary: boolean;
  }>,
): Promise<CompanyContact> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("company_contacts") as any)
    .update(input)
    .eq("id", contactId)
    .select(CONTACT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as CompanyContact;
}

export async function removeContact(
  supabase: Client,
  contactId: string,
): Promise<void> {
  const { error } = await supabase
    .from("company_contacts")
    .delete()
    .eq("id", contactId);

  if (error) throw error;
}

// ── Health status lookup ──────────────────────────────────────────────────────

export async function getCompanyHealthStatuses(
  supabase: Client,
): Promise<CompanyHealthStatus[]> {
  const { data, error } = await supabase
    .from("company_health_statuses")
    .select("*")
    .order("display_order");

  if (error) throw error;
  return (data ?? []) as unknown as CompanyHealthStatus[];
}
