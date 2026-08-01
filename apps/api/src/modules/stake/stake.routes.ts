import type { FastifyInstance } from "fastify";
import type { StakeController } from "./stake.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export default async function stakeRoutes(app: FastifyInstance, opts: { controller: StakeController }): Promise<void> {
  const { controller } = opts;
  app.get("/terms", controller.listTerms);
  app.post("/", { preHandler: [requireAuth] }, controller.create);
  app.get("/", { preHandler: [requireAuth] }, controller.list);
  app.post("/:positionId/withdraw", { preHandler: [requireAuth] }, controller.withdraw);
}
