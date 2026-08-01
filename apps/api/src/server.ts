import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import { loadEnv } from "./config/env.js";
import prismaPlugin from "./plugins/prisma.plugin.js";
import redisPlugin from "./plugins/redis.plugin.js";
import blockchainPlugin from "./plugins/blockchain.plugin.js";
import securityPlugin from "./plugins/security.plugin.js";
import errorHandlerPlugin from "./plugins/error-handler.plugin.js";
import registerRoutes from "./routes/index.js";

export async function buildServer(): Promise<FastifyInstance> {
  const env = loadEnv();

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
          : undefined,
    },
    trustProxy: true,
  });

  await app.register(sensible);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(securityPlugin);
  await app.register(blockchainPlugin);

  await app.register(registerRoutes);

  return app;
}
