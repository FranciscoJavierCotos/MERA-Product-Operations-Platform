/** Thin client-side shim around the owned API. */

import { apiBrowser } from "@/lib/api-client-browser";
import type { Profile } from "@/types/user.types";

type AnyClient = unknown;

/** @deprecated */
export async function getProfile(_sb: AnyClient, userId: string) {
  return apiBrowser.get<Profile | null>(`/users/${userId}`);
}

/** @deprecated */
export async function getAllProfiles(_sb: AnyClient) {
  return apiBrowser.get<Profile[]>("/users");
}

/** @deprecated */
export async function getSupportMembers(_sb: AnyClient) {
  return apiBrowser.get<Profile[]>("/users/support");
}

/** @deprecated */
export async function updateProfile(
  _sb: AnyClient,
  userId: string,
  updates: Partial<Profile>,
) {
  return apiBrowser.patch<Profile>(`/users/${userId}`, updates);
}
