import type { FastifyInstance } from "fastify";
import type { FaucetController } from "./faucet.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export default async function faucetRoutes(app: FastifyInstance, opts: { controller: FaucetController }): Promise<void> {
  const { controller } = opts;
  app.post("/", { preHandler: [requireAuth] }, controller.request);
}
