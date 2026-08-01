import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyRedis from "@fastify/redis";
import { loadEnv } from "../config/env.js";

export default fp(async function redisPlugin(app: FastifyInstance) {
  const env = loadEnv();
  await app.register(fastifyRedis, {
    url: env.REDIS_URL,
    closeClient: true,
  });
});
