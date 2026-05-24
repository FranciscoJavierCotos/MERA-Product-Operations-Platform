import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import { ZodError } from "zod";

// PostgreSQL error codes propagated by the Supabase PostgREST client.
// Thrown as PostgrestError (extends Error) when a DB constraint or trigger
// raises an exception. They have a `code` string but no `statusCode`.
const PG_CHECK_VIOLATION  = "23514"; // RAISE EXCEPTION ... USING ERRCODE = 'check_violation'
const PG_UNIQUE_VIOLATION = "23505"; // UNIQUE constraint
const PG_FOREIGN_KEY      = "23503"; // FK constraint
const PG_NOT_NULL         = "23502"; // NOT NULL constraint

export default fp(async (app) => {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    // ── Zod validation errors (request schema) ─────────────────────────────
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_error",
        details: err.flatten(),
      });
    }

    // ── PostgreSQL constraint / trigger exceptions ─────────────────────────
    // Maps well-known Postgres error codes to appropriate HTTP status codes
    // so DB-level enforcement (e.g. resolution required on final status)
    // surfaces as a meaningful 4xx rather than an opaque 500.
    if (err.code === PG_CHECK_VIOLATION) {
      return reply.code(422).send({
        error: "constraint_violation",
        message: err.message,
      });
    }
    if (err.code === PG_UNIQUE_VIOLATION) {
      return reply.code(409).send({
        error: "conflict",
        message: err.message,
      });
    }
    if (err.code === PG_FOREIGN_KEY) {
      return reply.code(422).send({
        error: "invalid_reference",
        message: err.message,
      });
    }
    if (err.code === PG_NOT_NULL) {
      return reply.code(422).send({
        error: "missing_required_field",
        message: err.message,
      });
    }

    // ── Generic fallback ───────────────────────────────────────────────────
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      req.log.error({ err }, "unhandled error");
    } else {
      req.log.warn({ err }, "request error");
    }

    return reply.code(statusCode).send({
      error: err.code ?? (statusCode >= 500 ? "internal_error" : "request_error"),
      message: err.message,
    });
  });

  app.setNotFoundHandler((req, reply) => {
    return reply.code(404).send({ error: "not_found", message: `${req.method} ${req.url}` });
  });
});
