import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import { ZodError } from "zod";

export default fp(async (app) => {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_error",
        details: err.flatten(),
      });
    }

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
