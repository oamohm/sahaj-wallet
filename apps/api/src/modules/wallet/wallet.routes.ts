import type { FastifyInstance } from "fastify";
import { createWalletController } from "./wallet.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export default async function walletRoutes(app: FastifyInstance): Promise<void> {
  const controller = createWalletController(app.prisma, app.adapterRegistry, app.circleUsdc);

  app.get("/networks", controller.listNetworks);
  app.get("/balance", controller.getBalance);

  app.get("/mine", { preHandler: [requireAuth] }, controller.listMyWallets);
  app.post("/link", { preHandler: [requireAuth] }, controller.linkWallet);
  app.post("/record-tx", { preHandler: [requireAuth] }, controller.recordExternalTx);

  app.post("/circle/wallets", { preHandler: [requireAuth] }, controller.createCircleWallet);
  app.get("/circle/balance", { preHandler: [requireAuth] }, controller.getUnifiedBalance);
  app.post("/circle/send", { preHandler: [requireAuth] }, controller.sendUsdc);
}
