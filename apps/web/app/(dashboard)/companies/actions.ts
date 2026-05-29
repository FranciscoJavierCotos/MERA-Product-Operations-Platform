"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api-client";
import {
  companySchema,
  updateCompanySchema,
  companyHealthSchema,
  companyContactSchema,
} from "@/lib/validations/company.schema";
import type { Company, CompanyContact } from "@/types/company.types";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await api.get<{ role: string } | null>(`/users/${user.id}`);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return { user };
}

async function assertSupportOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await api.get<{ role: string } | null>(`/users/${user.id}`);
  if (
    !profile ||
    !["admin", "support_lead", "support_member"].includes(profile.role)
  ) {
    throw new Error("Forbidden: support role required");
  }
  return { user };
}

function handleError(err: unknown): string {
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  if (message.includes("23503") || message.includes("foreign key")) {
    return "Cannot delete: this company is still referenced by existing records.";
  }
  if (message.includes("23505") || message.includes("unique")) {
    return "A contact with that email already exists for this company.";
  }
  return message;
}

// ── Company CRUD (admin) ──────────────────────────────────────────────────────

export async function createCompanyAction(
  input: unknown,
): Promise<ActionResult<Company>> {
  try {
    await assertAdmin();
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const company = await api.post<Company>("/companies", parsed.data);
    revalidatePath("/companies");
    return { ok: true, data: company };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateCompanyAction(
  input: unknown,
): Promise<ActionResult<Company>> {
  try {
    await assertAdmin();
    const parsed = updateCompanySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const company = await api.patch<Company>(`/companies/${id}`, rest);
    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
    return { ok: true, data: company };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteCompanyAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/companies/${id}`);
    revalidatePath("/companies");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Health (support_or_admin) ─────────────────────────────────────────────────

export async function updateCompanyHealthAction(
  companyId: string,
  input: unknown,
): Promise<ActionResult<Company>> {
  try {
    await assertSupportOrAdmin();
    const parsed = companyHealthSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const company = await api.patch<Company>(
      `/companies/${companyId}/health`,
      parsed.data,
    );
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, data: company };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Contacts (support_or_admin) ───────────────────────────────────────────────

export async function addContactAction(
  companyId: string,
  input: unknown,
): Promise<ActionResult<CompanyContact>> {
  try {
    await assertSupportOrAdmin();
    const parsed = companyContactSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const contact = await api.post<CompanyContact>(
      `/companies/${companyId}/contacts`,
      parsed.data,
    );
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, data: contact };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateContactAction(
  companyId: string,
  contactId: string,
  input: unknown,
): Promise<ActionResult<CompanyContact>> {
  try {
    await assertSupportOrAdmin();
    const parsed = companyContactSchema.partial().safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const contact = await api.patch<CompanyContact>(
      `/companies/${companyId}/contacts/${contactId}`,
      parsed.data,
    );
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, data: contact };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function removeContactAction(
  companyId: string,
  contactId: string,
): Promise<ActionResult<void>> {
  try {
    await assertSupportOrAdmin();
    await api.del(`/companies/${companyId}/contacts/${contactId}`);
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}
