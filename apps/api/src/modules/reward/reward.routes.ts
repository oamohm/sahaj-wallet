import type { FastifyInstance } from "fastify";
import type { RewardController } from "./reward.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export default async function rewardRoutes(app: FastifyInstance, opts: { controller: RewardController }): Promise<void> {
  const { controller } = opts;

  app.get("/balance", { preHandler: [requireAuth] }, controller.getBalance);
  app.get("/history", { preHandler: [requireAuth] }, controller.getHistory);
  app.post("/claims", { preHandler: [requireAuth] }, controller.claim);
  app.get("/claims", { preHandler: [requireAuth] }, controller.listClaims);
  app.get("/claims/:claimId", { preHandler: [requireAuth] }, controller.getClaimStatus);
}
