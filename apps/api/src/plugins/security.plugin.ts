import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { loadEnv } from "../config/env.js";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "../constants/index.js";

export default fp(async function securityPlugin(app: FastifyInstance) {
  const env = loadEnv();

  await app.register(helmet, {
    global: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  await app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW_MS,
    redis: app.redis,
    errorResponseBuilder: () => ({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests, please try again shortly.",
      },
    }),
  });
});
