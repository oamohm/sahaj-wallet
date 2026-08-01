import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, "Handled application error");
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: zodDetails(error),
        },
      });
    }

    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: fastifyError.message,
          details: fastifyError.validation,
        },
      });
    }

    if (fastifyError.statusCode === 429) {
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      });
    }

    request.log.error({ err: error }, "Unhandled error");
    const statusCode = fastifyError.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: {
        code: "INTERNAL_ERROR",
        message: statusCode === 500 ? "An unexpected error occurred" : fastifyError.message,
      },
    });
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: { code: "ROUTE_NOT_FOUND", message: `Route ${request.method} ${request.url} not found` },
    });
  });
});
