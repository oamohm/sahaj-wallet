import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { loadEnv } from "../config/env.js";

/**
 * Fastify preHandler that requires a valid `Authorization: Bearer <token>`
 * header. On success, `request.authUser` is populated for downstream
 * handlers. Register with `{ preHandler: [requireAuth] }` on any protected
 * route.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  const env = loadEnv();

  try {
    request.authUser = verifyAccessToken(token, env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.authUser?.role !== "admin") {
    throw new UnauthorizedError("Admin privileges required");
  }
}
