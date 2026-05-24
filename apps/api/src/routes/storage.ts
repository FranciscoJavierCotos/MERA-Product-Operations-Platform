import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

/**
 * Storage endpoints. We don't proxy file bytes through the API — that would
 * cost an extra hop for nothing. Instead the API mints a one-shot signed
 * upload URL using the user's RLS-scoped Supabase client; the browser then
 * PUTs the file directly to Storage. The bucket's existing RLS policy still
 * gates who can upload.
 */

const TicketUploadBody = z.object({
  ticketId: z.string().uuid(),
  filename: z.string().min(1),
});

const KbUploadBody = z.object({
  documentId: z.string().uuid(),
  version: z.number().int().min(1),
  filename: z.string().min(1),
});

const KbDownloadBody = z.object({
  path: z.string().min(1),
  expiresIn: z.number().int().min(60).max(3600).optional(),
});

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const storageRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public bucket — uploads need a signed URL; downloads are public.
  app.post(
    "/storage/ticket-attachments/sign-upload",
    { schema: { tags: ["storage"], body: TicketUploadBody } },
    async (req, reply) => {
      const path = `${req.body.ticketId}/${Date.now()}-${sanitize(req.body.filename)}`;
      const { data, error } = await req.supabase.storage
        .from("ticket-attachments")
        .createSignedUploadUrl(path);
      if (error || !data) {
        return reply.code(500).send({ error: "sign_failed", message: error?.message });
      }
      const { data: pub } = req.supabase.storage
        .from("ticket-attachments")
        .getPublicUrl(path);
      return {
        signedUrl: data.signedUrl,
        token: data.token,
        path,
        publicUrl: pub.publicUrl,
      };
    },
  );

  // Private bucket — uploads and downloads both need signed URLs.
  app.post(
    "/storage/kb-documents/sign-upload",
    { schema: { tags: ["storage"], body: KbUploadBody } },
    async (req, reply) => {
      const path = `${req.body.documentId}/v${req.body.version}/${sanitize(req.body.filename)}`;
      const { data, error } = await req.supabase.storage
        .from("kb-documents")
        .createSignedUploadUrl(path);
      if (error || !data) {
        return reply.code(500).send({ error: "sign_failed", message: error?.message });
      }
      return {
        signedUrl: data.signedUrl,
        token: data.token,
        path,
      };
    },
  );

  app.post(
    "/storage/kb-documents/sign-download",
    { schema: { tags: ["storage"], body: KbDownloadBody } },
    async (req, reply) => {
      const expiresIn = req.body.expiresIn ?? 600;
      const { data, error } = await req.supabase.storage
        .from("kb-documents")
        .createSignedUrl(req.body.path, expiresIn);
      if (error || !data) {
        return reply.code(500).send({ error: "sign_failed", message: error?.message });
      }
      return { signedUrl: data.signedUrl };
    },
  );

  const DeleteBody = z.object({ paths: z.array(z.string().min(1)).min(1) });

  app.post(
    "/storage/kb-documents/delete",
    { schema: { tags: ["storage"], body: DeleteBody } },
    async (req, reply) => {
      const { error } = await req.supabase.storage
        .from("kb-documents")
        .remove(req.body.paths);
      if (error) {
        return reply.code(500).send({ error: "delete_failed", message: error.message });
      }
      return { ok: true };
    },
  );
};
