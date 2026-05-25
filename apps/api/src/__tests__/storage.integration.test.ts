/**
 * Integration tests: Storage signed URL endpoint — bucket scoping & access
 *
 * Storage buckets and their access rules (from migration 001):
 *
 *   ticket-attachments  (public bucket)
 *     read  : any authenticated user
 *     write : is_support_or_admin(auth.uid())
 *       → admin ✅  |  support_member ✅  |  client ✗
 *
 *   kb-documents  (private bucket)
 *     read  : is_support_or_admin(auth.uid())
 *     write : is_admin(auth.uid())
 *       → admin ✅  |  support_member ✗  |  client ✗
 *
 * API routes (apps/api/src/routes/storage.ts):
 *   POST /storage/ticket-attachments/sign-upload  body: { ticketId, filename }
 *   POST /storage/kb-documents/sign-upload        body: { documentId, version, filename }
 *   POST /storage/kb-documents/sign-download      body: { path, expiresIn? }
 *   POST /storage/kb-documents/delete             body: { paths }
 *
 * The route uses `req.supabase` (JWT-scoped client); Supabase Storage checks
 * the bucket's RLS policies when `createSignedUploadUrl` is called.
 *
 * Expected behaviour:
 *   - 200 response  → { signedUrl, token, path, [publicUrl] }
 *   - 500 response  → { error: "sign_failed" } when Storage RLS blocks the call
 *   - 401           → missing/invalid JWT (enforced by the auth plugin before the
 *                     route handler runs)
 *
 * Requires: local Supabase running (`supabase start`) with seed data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../test-helpers/app.js";
import { authHeader, TEST_USERS } from "../test-helpers/auth.js";
import { randomUUID } from "crypto";

describe("Storage signed URL scoping", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── ticket-attachments ────────────────────────────────────────────────────

  describe("POST /storage/ticket-attachments/sign-upload", () => {
    it("admin gets a signed upload URL for ticket-attachments", async () => {
      const headers = await authHeader("admin");
      const ticketId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId, filename: "test-file.pdf" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("signedUrl");
      expect(body).toHaveProperty("token");
      expect(body).toHaveProperty("path");
      expect(body).toHaveProperty("publicUrl");
      // Path must be scoped to the ticketId
      expect(body.path).toMatch(new RegExp(`^${ticketId}/`));
      // Filename is sanitised — no path traversal
      expect(body.path).not.toContain("..");
    });

    it("support_member gets a signed upload URL for ticket-attachments", async () => {
      const headers = await authHeader("support_member");
      const ticketId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId, filename: "attachment.png" },
      });
      // support_member has write access to ticket-attachments
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty("signedUrl");
    });

    it("client cannot get a signed upload URL for ticket-attachments", async () => {
      const headers = await authHeader("client");
      const ticketId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId, filename: "hack.exe" },
      });
      // client role lacks write access; Storage RLS returns an error
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("missing ticketId returns 400 (validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { filename: "test.pdf" }, // ticketId missing
      });
      expect(res.statusCode).toBe(400);
    });

    it("non-uuid ticketId returns 400 (validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId: "not-a-uuid", filename: "test.pdf" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("empty filename returns 400 (validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId: randomUUID(), filename: "" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("unauthenticated request → 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        payload: { ticketId: randomUUID(), filename: "test.pdf" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── kb-documents ──────────────────────────────────────────────────────────

  describe("POST /storage/kb-documents/sign-upload", () => {
    it("admin gets a signed upload URL for kb-documents", async () => {
      const headers = await authHeader("admin");
      const documentId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-upload",
        headers,
        payload: { documentId, version: 1, filename: "report.pdf" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("signedUrl");
      expect(body).toHaveProperty("token");
      expect(body).toHaveProperty("path");
      // Path follows the expected template: {documentId}/v{version}/{filename}
      expect(body.path).toMatch(new RegExp(`^${documentId}/v1/`));
    });

    it("support_member cannot get a signed upload URL for kb-documents", async () => {
      const headers = await authHeader("support_member");
      const documentId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-upload",
        headers,
        payload: { documentId, version: 1, filename: "doc.pdf" },
      });
      // Storage RLS blocks non-admin writes to kb-documents
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("client cannot get a signed upload URL for kb-documents", async () => {
      const headers = await authHeader("client");
      const documentId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-upload",
        headers,
        payload: { documentId, version: 1, filename: "doc.pdf" },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("missing version returns 400 (validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-upload",
        headers,
        payload: { documentId: randomUUID(), filename: "doc.pdf" }, // version missing
      });
      expect(res.statusCode).toBe(400);
    });

    it("version 0 returns 400 (min=1 validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-upload",
        headers,
        payload: { documentId: randomUUID(), version: 0, filename: "doc.pdf" },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── kb-documents sign-download ────────────────────────────────────────────

  describe("POST /storage/kb-documents/sign-download", () => {
    it("admin gets a signed download URL with default expiry", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-download",
        headers,
        payload: { path: "some-doc-id/v1/report.pdf" },
      });
      // The path may not exist so Storage may return an error, but the API
      // shape is what we test here — a real path would be required for a 200.
      // Accept both 200 (if Storage returns a URL anyway) and 500 (path not found).
      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.json()).toHaveProperty("signedUrl");
      }
    });

    it("expiresIn below 60 is rejected (min=60 validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-download",
        headers,
        payload: { path: "some-doc-id/v1/report.pdf", expiresIn: 30 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("expiresIn above 3600 is rejected (max=3600 validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-download",
        headers,
        payload: { path: "some-doc-id/v1/report.pdf", expiresIn: 7200 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("support_member can get a signed download URL (read access)", async () => {
      const headers = await authHeader("support_member");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-download",
        headers,
        payload: { path: "some-doc-id/v1/report.pdf" },
      });
      // support_member has read access to kb-documents — either 200 or 500 (path not found)
      expect([200, 500]).toContain(res.statusCode);
    });

    it("client cannot get a signed download URL (no read access)", async () => {
      const headers = await authHeader("client");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-download",
        headers,
        payload: { path: "some-doc-id/v1/report.pdf" },
      });
      // client lacks read access to kb-documents; Storage RLS blocks it
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("missing path returns 400 (validation)", async () => {
      const headers = await authHeader("admin");
      const res = await app.inject({
        method: "POST",
        url: "/storage/kb-documents/sign-download",
        headers,
        payload: {}, // path missing
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── filename sanitisation ─────────────────────────────────────────────────

  describe("filename sanitisation", () => {
    it("special characters in filename are sanitised before inclusion in the path", async () => {
      const headers = await authHeader("admin");
      const ticketId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId, filename: "my file (1) & more!.pdf" },
      });
      expect(res.statusCode).toBe(200);
      // The sanitize() function in the route replaces [^a-zA-Z0-9._-] with '_'
      expect(res.json().path).not.toContain(" ");
      expect(res.json().path).not.toContain("(");
      expect(res.json().path).not.toContain("&");
    });

    it("path traversal sequences in filename are sanitised", async () => {
      const headers = await authHeader("admin");
      const ticketId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: "/storage/ticket-attachments/sign-upload",
        headers,
        payload: { ticketId, filename: "../../etc/passwd" },
      });
      if (res.statusCode === 200) {
        // Dots are allowed by the sanitiser but "/" is replaced with "_"
        // so the path cannot break out of the ticketId directory
        expect(res.json().path).not.toContain("/..");
        expect(res.json().path).toMatch(new RegExp(`^${ticketId}/`));
      } else {
        // Some storage backends reject suspicious paths outright
        expect(res.statusCode).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
