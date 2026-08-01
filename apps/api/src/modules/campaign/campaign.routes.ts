import type { FastifyInstance } from "fastify";
import type { CampaignController } from "./campaign.controller.js";
import { requireAdmin, requireAuth } from "../../middlewares/auth.middleware.js";

export default async function campaignRoutes(app: FastifyInstance, opts: { controller: CampaignController }): Promise<void> {
  const { controller } = opts;

  app.get("/", controller.list);
  app.get("/:campaignId", controller.getById);

  app.post("/", { preHandler: [requireAdmin] }, controller.create);
  app.post("/:campaignId/publish", { preHandler: [requireAdmin] }, controller.publish);
  app.post("/:campaignId/archive", { preHandler: [requireAdmin] }, controller.archive);

  app.post("/:campaignId/join", { preHandler: [requireAuth] }, controller.join);
  app.get("/:campaignId/progress", { preHandler: [requireAuth] }, controller.getMyProgress);
}
