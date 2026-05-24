"use client";

/**
 * Thin client-side shims that delegate to the owned API.
 *
 * Kept here (instead of inlined at call sites) so the migration was minimal
 * touch — every caller still imports the same name from the same path. The
 * Supabase client parameter is accepted but unused; it will be removed in
 * the Phase 6 lockdown.
 */

import { apiBrowser } from "@/lib/api-client-browser";
import type { TicketComment } from "@/types/ticket.types";

// Unused first arg kept for signature compatibility with the old impl.
type AnyClient = unknown;

export async function getCommentsByTicket(_sb: AnyClient, ticketId: string) {
  return apiBrowser.get<TicketComment[]>(`/tickets/${ticketId}/comments`);
}

export async function createComment(
  _sb: AnyClient,
  comment: {
    ticket_id: string;
    content: string;
    time_worked_minutes?: number;
    is_internal?: boolean;
  },
) {
  return apiBrowser.post<TicketComment>(
    `/tickets/${comment.ticket_id}/comments`,
    {
      content: comment.content,
      time_worked_minutes: comment.time_worked_minutes,
      is_internal: comment.is_internal,
    },
  );
}

export async function updateComment(
  _sb: AnyClient,
  commentId: string,
  content: string,
) {
  return apiBrowser.patch<TicketComment>(`/comments/${commentId}`, { content });
}

export async function deleteComment(_sb: AnyClient, commentId: string) {
  await apiBrowser.del(`/comments/${commentId}`);
  return { success: true } as const;
}

/**
 * Uploads an image to the ticket-attachments bucket via the API-issued
 * one-shot signed URL, then returns the public URL.
 */
export async function uploadCommentImage(
  _sb: AnyClient,
  file: File,
  ticketId: string,
): Promise<string> {
  const { signedUrl, publicUrl } = await apiBrowser.post<{
    signedUrl: string;
    token: string;
    path: string;
    publicUrl: string;
  }>("/storage/ticket-attachments/sign-upload", {
    ticketId,
    filename: file.name,
  });

  const putRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status} ${putRes.statusText}`);
  }
  return publicUrl;
}
