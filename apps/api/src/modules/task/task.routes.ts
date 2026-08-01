import type { FastifyInstance } from "fastify";
import type { TaskController } from "./task.controller.js";
import { requireAdmin, requireAuth } from "../../middlewares/auth.middleware.js";

export default async function taskRoutes(app: FastifyInstance, opts: { controller: TaskController }): Promise<void> {
  const { controller } = opts;

  app.get("/campaign/:campaignId", controller.listForCampaign);
  app.post("/", { preHandler: [requireAdmin] }, controller.create);
  app.post("/review", { preHandler: [requireAdmin] }, controller.review);
  app.post("/submit", { preHandler: [requireAuth] }, controller.submit);
}
