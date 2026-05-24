import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { TicketComment } from "@/types/ticket.types";

type Client = SupabaseClient<Database>;

export async function getCommentsByTicket(supabase: Client, ticketId: string) {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select(
      `
      *,
      user:profiles(id, full_name, email, avatar_url)
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TicketComment[];
}

export async function createComment(
  supabase: Client,
  comment: {
    ticket_id: string;
    content: string;
    time_worked_minutes?: number;
    is_internal?: boolean;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await (supabase.from("ticket_comments") as any)
    .insert([
      {
        ticket_id: comment.ticket_id,
        user_id: user.id,
        content: comment.content,
        time_worked_minutes: comment.time_worked_minutes || 0,
        is_internal: comment.is_internal || false,
      },
    ])
    .select(
      `
      *,
      user:profiles(id, full_name, email, avatar_url)
    `
    )
    .single();

  if (error) throw error;
  return data as unknown as TicketComment;
}

export async function updateComment(
  supabase: Client,
  commentId: string,
  content: string
) {
  const { data, error } = await (supabase.from("ticket_comments") as any)
    .update({ content })
    .eq("id", commentId)
    .select(
      `
      *,
      user:profiles(id, full_name, email, avatar_url)
    `
    )
    .single();

  if (error) throw error;
  return data as unknown as TicketComment;
}

export async function deleteComment(supabase: Client, commentId: string) {
  const { error } = await supabase
    .from("ticket_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
  return { success: true };
}

export async function uploadCommentImage(
  supabase: Client,
  file: File,
  ticketId: string
) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${ticketId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("ticket-attachments").getPublicUrl(fileName);

  return publicUrl;
}
