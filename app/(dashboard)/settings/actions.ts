"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  teamSchema,
  updateTeamSchema,
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
import {
  createTeam,
  updateTeam,
  deleteTeam,
} from "@/lib/supabase/queries/teams";
import {
  createTicketStatus,
  updateTicketStatus,
  deleteTicketStatus,
  createTicketPriority,
  updateTicketPriority,
  deleteTicketPriority,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
  createTag,
  updateTag,
  deleteTag,
} from "@/lib/supabase/queries/lookup";
import {
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
} from "@/lib/supabase/queries/slas";
import { updateProfile } from "@/lib/supabase/queries/users";
import type { Team } from "@/types/team.types";
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return { supabase, user };
}

// FK violation → user-friendly message
function handleError(err: unknown): string {
  if (err instanceof Error) {
    // Postgres FK violation
    if (err.message.includes("23503") || err.message.includes("foreign key")) {
      return "Cannot delete: this item is still referenced by existing records.";
    }
    // Postgres unique violation
    if (err.message.includes("23505") || err.message.includes("unique")) {
      return "A record with that name or identifier already exists.";
    }
    return err.message;
  }
  return String(err);
}

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/tickets");
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function createTeamAction(
  input: unknown,
): Promise<ActionResult<Team>> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = teamSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const team = await createTeam(supabase, parsed.data);
    revalidatePath("/settings");
    return { ok: true, data: team };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateTeamAction(
  input: unknown,
): Promise<ActionResult<Team>> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = updateTeamSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const team = await updateTeam(supabase, id!, rest);
    revalidatePath("/settings");
    return { ok: true, data: team };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteTeamAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const { supabase } = await assertAdmin();
    await deleteTeam(supabase, id);
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

// ── Ticket Statuses ───────────────────────────────────────────────────────────

export async function createTicketStatusAction(
  input: unknown,
): Promise<ActionResult<TicketStatusRow>> {
  try {
    const { supabase } = await assertAdmin();
    const parsed = ticketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await createTicketStatus(supabase, parsed.data);
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
    const { supabase } = await assertAdmin();
    const parsed = updateTicketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await updateTicketStatus(supabase, id!, rest);
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
    const { supabase } = await assertAdmin();
    await deleteTicketStatus(supabase, id);
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
    const { supabase } = await assertAdmin();
    const parsed = ticketPrioritySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await createTicketPriority(supabase, parsed.data);
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
    const { supabase } = await assertAdmin();
    const parsed = updateTicketPrioritySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await updateTicketPriority(supabase, id!, rest);
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
    const { supabase } = await assertAdmin();
    await deleteTicketPriority(supabase, id);
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
    const { supabase } = await assertAdmin();
    const parsed = ticketCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await createTicketCategory(supabase, parsed.data);
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
    const { supabase } = await assertAdmin();
    const parsed = updateTicketCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await updateTicketCategory(supabase, id!, rest);
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
    const { supabase } = await assertAdmin();
    await deleteTicketCategory(supabase, id);
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
    const { supabase } = await assertAdmin();
    const parsed = tagSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await createTag(supabase, parsed.data);
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
    const { supabase } = await assertAdmin();
    const parsed = updateTagSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await updateTag(supabase, id!, rest);
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
    const { supabase } = await assertAdmin();
    await deleteTag(supabase, id);
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
    const { supabase } = await assertAdmin();
    const parsed = slaPolicySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const row = await createSlaPolicy(supabase, parsed.data);
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
    const { supabase } = await assertAdmin();
    const parsed = updateSlaPolicySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const row = await updateSlaPolicy(supabase, id!, rest);
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
    const { supabase } = await assertAdmin();
    await deleteSlaPolicy(supabase, id);
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
    const { supabase, user } = await assertAdmin();
    const parsed = profileAdminUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    // Prevent admin from removing their own admin role
    if (id === user.id && rest.role && rest.role !== "admin") {
      return { ok: false, error: "You cannot change your own role." };
    }
    // updateProfile uses `as any` cast internally, so null team_id is safe
    const profile = await updateProfile(supabase, id, rest as Parameters<typeof updateProfile>[2]);
    revalidatePath("/settings");
    return { ok: true, data: profile };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}
