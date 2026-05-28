"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api-client";
import {
  ticketStatusSchema,
  updateTicketStatusSchema,
  ticketPrioritySchema,
  updateTicketPrioritySchema,
  ticketCategorySchema,
  updateTicketCategorySchema,
  tagSchema,
  updateTagSchema,
  slaPolicySchema,
  updateSlaPolicySchema,
  profileAdminUpdateSchema,
} from "@/lib/validations/settings.schema";
import type {
  TicketStatusRow,
  TicketPriorityRow,
  TicketCategoryRow,
  TicketTagRow,
} from "@/types/ticket.types";
import type { SlaPolicy } from "@/types/sla.types";
import type { Profile } from "@/types/user.types";

// ── Shared types ──────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Auth helper ───────────────────────────────────────────────────────────────

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

function handleError(err: unknown): string {
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  if (message.includes("23503") || message.includes("foreign key")) {
    return "Cannot delete: this item is still referenced by existing records.";
  }
  if (message.includes("23505") || message.includes("unique")) {
    return "A record with that name or identifier already exists.";
  }
  return message;
}

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/tickets");
}

// ── Ticket Statuses ───────────────────────────────────────────────────────────

export async function createTicketStatusAction(
  input: unknown,
): Promise<ActionResult<TicketStatusRow>> {
  try {
    await assertAdmin();
    const parsed = ticketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await api.post<TicketStatusRow>("/lookup/statuses", parsed.data);
    revalidateAll();
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateTicketStatusAction(
  input: unknown,
): Promise<ActionResult<TicketStatusRow>> {
  try {
    await assertAdmin();
    const parsed = updateTicketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await api.patch<TicketStatusRow>(`/lookup/statuses/${id}`, rest);
    revalidateAll();
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteTicketStatusAction(
  id: number,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/lookup/statuses/${id}`);
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Ticket Priorities ─────────────────────────────────────────────────────────

export async function createTicketPriorityAction(
  input: unknown,
): Promise<ActionResult<TicketPriorityRow>> {
  try {
    await assertAdmin();
    const parsed = ticketPrioritySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await api.post<TicketPriorityRow>("/lookup/priorities", parsed.data);
    revalidateAll();
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateTicketPriorityAction(
  input: unknown,
): Promise<ActionResult<TicketPriorityRow>> {
  try {
    await assertAdmin();
    const parsed = updateTicketPrioritySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await api.patch<TicketPriorityRow>(`/lookup/priorities/${id}`, rest);
    revalidateAll();
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteTicketPriorityAction(
  id: number,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/lookup/priorities/${id}`);
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Ticket Categories ─────────────────────────────────────────────────────────

export async function createTicketCategoryAction(
  input: unknown,
): Promise<ActionResult<TicketCategoryRow>> {
  try {
    await assertAdmin();
    const parsed = ticketCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await api.post<TicketCategoryRow>("/lookup/categories", parsed.data);
    revalidateAll();
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateTicketCategoryAction(
  input: unknown,
): Promise<ActionResult<TicketCategoryRow>> {
  try {
    await assertAdmin();
    const parsed = updateTicketCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await api.patch<TicketCategoryRow>(`/lookup/categories/${id}`, rest);
    revalidateAll();
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteTicketCategoryAction(
  id: number,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/lookup/categories/${id}`);
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function createTagAction(
  input: unknown,
): Promise<ActionResult<TicketTagRow>> {
  try {
    await assertAdmin();
    const parsed = tagSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await api.post<TicketTagRow>("/lookup/tags", parsed.data);
    revalidatePath("/settings");
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateTagAction(
  input: unknown,
): Promise<ActionResult<TicketTagRow>> {
  try {
    await assertAdmin();
    const parsed = updateTagSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await api.patch<TicketTagRow>(`/lookup/tags/${id}`, rest);
    revalidatePath("/settings");
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteTagAction(
  id: number,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/lookup/tags/${id}`);
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── SLA Policies ──────────────────────────────────────────────────────────────

export async function createSlaPolicyAction(
  input: unknown,
): Promise<ActionResult<SlaPolicy>> {
  try {
    await assertAdmin();
    const parsed = slaPolicySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await api.post<SlaPolicy>("/sla/policies", parsed.data);
    revalidatePath("/settings");
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateSlaPolicyAction(
  input: unknown,
): Promise<ActionResult<SlaPolicy>> {
  try {
    await assertAdmin();
    const parsed = updateSlaPolicySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await api.patch<SlaPolicy>(`/sla/policies/${id}`, rest);
    revalidatePath("/settings");
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteSlaPolicyAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/sla/policies/${id}`);
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Profiles (admin update only) ──────────────────────────────────────────────

export async function updateProfileAdminAction(
  input: unknown,
): Promise<ActionResult<Profile>> {
  try {
    const { user } = await assertAdmin();
    const parsed = profileAdminUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    // Prevent admin from removing their own admin role
    if (id === user.id && rest.role && rest.role !== "admin") {
      return { ok: false, error: "You cannot change your own role." };
    }
    const profile = await api.patch<Profile>(`/users/${id}`, rest);
    revalidatePath("/settings");
    return { ok: true, data: profile };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}
