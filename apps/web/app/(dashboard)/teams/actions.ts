"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api-client";
import {
  teamSchema,
  updateTeamSchema,
} from "@/lib/validations/settings.schema";
import type { Team } from "@/types/team.types";

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

function handleError(err: unknown): string {
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  if (message.includes("23503") || message.includes("foreign key")) {
    return "Cannot delete: this team is still referenced by existing records.";
  }
  if (message.includes("23505") || message.includes("unique")) {
    return "A team with that name already exists.";
  }
  return message;
}

export async function createTeamAction(
  input: unknown,
): Promise<ActionResult<Team>> {
  try {
    await assertAdmin();
    const parsed = teamSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const team = await api.post<Team>("/teams", parsed.data);
    revalidatePath("/teams");
    return { ok: true, data: team };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function updateTeamAction(
  input: unknown,
): Promise<ActionResult<Team>> {
  try {
    await assertAdmin();
    const parsed = updateTeamSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...rest } = parsed.data;
    const team = await api.patch<Team>(`/teams/${id}`, rest);
    revalidatePath("/teams");
    revalidatePath(`/teams/${id}`);
    return { ok: true, data: team };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}

export async function deleteTeamAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await assertAdmin();
    await api.del(`/teams/${id}`);
    revalidatePath("/teams");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: handleError(err) };
  }
}
