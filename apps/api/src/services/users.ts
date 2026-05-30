import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@stms/contracts";
import { Profile } from "../types/user.types";

// â”€â”€â”€ Typed update payloads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// These mirror the Zod schemas in routes/users.ts and are exported so the
// route handler can use them without re-declaring the shapes.

/** Fields any authenticated user may update on their own profile. */
export type PublicProfileUpdate = {
  full_name?: string | undefined;
  avatar_url?: string | null | undefined;
};

/** Additional fields only an admin may update (on any profile). */
export type AdminProfileUpdate = PublicProfileUpdate & {
  role?: "admin" | "support_lead" | "support_member" | "client" | undefined;
  team_id?: string | null | undefined;
};

type Client = SupabaseClient<Database>;

export async function getProfile(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function getAllProfiles(supabase: Client) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) throw error;
  return data as Profile[];
}

export async function updateProfile(
  supabase: Client,
  userId: string,
  updates: PublicProfileUpdate | AdminProfileUpdate,
): Promise<Profile> {
  // The typed Supabase client resolves .update()'s argument to `never` when
  // the payload type isn't the exact generated Update shape â€” a known upstream
  // limitation. All other services in this codebase (tickets.ts:267,
  // tasks.ts:163, knowledge-admin.ts:70) use the same `as any` workaround.
  // Type safety is enforced at the function boundary via the typed `updates`
  // parameter above; the `as any` is scoped only to the query builder call.
  const { data, error } = await (supabase.from("profiles") as any)
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getSupportMembers(supabase: Client) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "support_lead", "support_member"])
    .order("full_name");

  if (error) throw error;
  return data as Profile[];
}
