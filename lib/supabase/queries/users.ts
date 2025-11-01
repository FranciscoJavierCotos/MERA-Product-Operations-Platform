import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Profile } from "@/types/user.types";

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
  updates: Partial<Profile>
) {
  const { data, error } = await supabase
    .from("profiles")
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
