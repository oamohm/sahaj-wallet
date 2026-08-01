import type { FastifyInstance } from "fastify";
import { createAuthController } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  const controller = createAuthController(app.prisma);

  app.post("/nonce", controller.requestNonce);
  app.post("/verify", controller.verify);
  app.post("/refresh", controller.refresh);
  app.post("/logout", controller.logout);
  app.get("/me", { preHandler: [requireAuth] }, controller.me);
}
