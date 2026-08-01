import type { FastifyInstance } from "fastify";
import { API_PREFIX } from "../constants/index.js";
import authRoutes from "../modules/auth/auth.routes.js";
import walletRoutes from "../modules/wallet/wallet.routes.js";
import rewardRoutes from "../modules/reward/reward.routes.js";
import campaignRoutes from "../modules/campaign/campaign.routes.js";
import taskRoutes from "../modules/task/task.routes.js";
import faucetRoutes from "../modules/faucet/faucet.routes.js";
import stakeRoutes from "../modules/stake/stake.routes.js";
import { RewardService } from "../modules/reward/reward.service.js";
import { RewardController } from "../modules/reward/reward.controller.js";
import { CampaignService } from "../modules/campaign/campaign.service.js";
import { CampaignController } from "../modules/campaign/campaign.controller.js";
import { TaskService } from "../modules/task/task.service.js";
import { TaskController } from "../modules/task/task.controller.js";
import { FaucetService } from "../modules/faucet/faucet.service.js";
import { FaucetController } from "../modules/faucet/faucet.controller.js";
import { StakeService } from "../modules/stake/stake.service.js";
import { StakeController } from "../modules/stake/stake.controller.js";

export default async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: `${API_PREFIX}/auth` });
  await app.register(walletRoutes, { prefix: `${API_PREFIX}/wallet` });

  // Reward, Campaign, and Task modules share service instances so that a
  // verified task can grant a reward AND trigger a campaign-completion
  // check through the exact same RewardService/CampaignService objects
  // (single source of truth, no duplicated business logic).
  const rewardService = new RewardService(app.prisma, app.circleUsdc, process.env.TREASURY_CIRCLE_WALLET_ID);
  const campaignService = new CampaignService(app.prisma, rewardService);
  const taskService = new TaskService(app.prisma, app.adapterRegistry, rewardService, campaignService);

  await app.register(rewardRoutes, {
    prefix: `${API_PREFIX}/rewards`,
    controller: new RewardController(rewardService),
  });
  await app.register(campaignRoutes, {
    prefix: `${API_PREFIX}/campaigns`,
    controller: new CampaignController(campaignService),
  });
  await app.register(taskRoutes, {
    prefix: `${API_PREFIX}/tasks`,
    controller: new TaskController(taskService),
  });
  await app.register(faucetRoutes, {
    prefix: `${API_PREFIX}/faucet`,
    controller: new FaucetController(new FaucetService(app.prisma, app.adapterRegistry)),
  });
  await app.register(stakeRoutes, {
    prefix: `${API_PREFIX}/stake`,
    controller: new StakeController(new StakeService(app.prisma, app.circleUsdc, process.env.TREASURY_CIRCLE_WALLET_ID)),
  });
}
