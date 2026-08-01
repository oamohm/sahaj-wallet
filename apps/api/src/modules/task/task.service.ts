import type { PrismaClient } from "@sahaj/database";
import type { AdapterRegistry } from "@sahaj/blockchain-adapters";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/app-error.js";
import type { CreateTaskInput, VerificationConfig } from "../../validators/task.validator.js";
import { RewardService } from "../reward/reward.service.js";
import { CampaignService } from "../campaign/campaign.service.js";

export class TaskService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly adapters: AdapterRegistry,
    private readonly rewardService: RewardService,
    private readonly campaignService: CampaignService,
  ) {}

  async create(input: CreateTaskInput) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) throw new NotFoundError("Campaign");

    return this.prisma.task.create({
      data: {
        campaignId: input.campaignId,
        type: input.type,
        title: input.title,
        description: input.description,
        rewardUsdcAmount: input.rewardUsdcAmount,
        xpReward: input.xpReward,
        isRequired: input.isRequired,
        verificationConfig: input.verificationConfig,
      },
    });
  }

  async listForCampaign(campaignId: string) {
    return this.prisma.task.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } });
  }

  /**
   * Submits proof of completion. Social tasks always land in `pending` for
   * admin review. Wallet and onchain tasks are verified synchronously here
   * — no human in the loop needed for something the chain itself proves.
   */
  async submit(userId: string, taskId: string, proof: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Task");

    const existing = await this.prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing && existing.status === "verified") {
      throw new ConflictError("You have already completed this task");
    }

    const config = task.verificationConfig as unknown as VerificationConfig;

    if (config.kind === "social") {
      return this.upsertCompletion(userId, taskId, proof, "pending");
    }

    if (config.kind === "wallet") {
      const linked = await this.prisma.walletAccount.findFirst({
        where: { userId, networkId: config.requiredNetworkId },
      });
      if (!linked) {
        throw new ValidationError(`Link a wallet on ${config.requiredNetworkId} before submitting this task`);
      }
      const completion = await this.upsertCompletion(userId, taskId, proof, "verified");
      await this.onVerified(userId, task);
      return completion;
    }

    // onchain: proof is a transaction hash we independently verify against
    // the chain via the adapter — never trust the client's say-so.
    const adapter = this.adapters.get(config.requiredNetworkId);
    const receipt = await adapter.getTransactionReceipt(proof);

    const userWallet = await this.prisma.walletAccount.findFirst({
      where: { userId, networkId: config.requiredNetworkId },
    });

    const fromMatches = userWallet && receipt.from.toLowerCase() === userWallet.address.toLowerCase();

    if (receipt.status !== "confirmed" || !fromMatches) {
      const completion = await this.upsertCompletion(userId, taskId, proof, "rejected");
      await this.prisma.taskCompletion.update({
        where: { id: completion.id },
        data: { rejectedReason: "Transaction not confirmed or does not originate from your linked wallet" },
      });
      throw new ValidationError("Could not verify this transaction against your linked wallet");
    }

    const completion = await this.upsertCompletion(userId, taskId, proof, "verified");
    await this.onVerified(userId, task);
    return completion;
  }

  /** Admin review path for social tasks. */
  async review(taskCompletionId: string, approve: boolean, rejectedReason?: string) {
    const completion = await this.prisma.taskCompletion.findUnique({
      where: { id: taskCompletionId },
      include: { task: true },
    });
    if (!completion) throw new NotFoundError("Task completion");
    if (completion.status !== "pending") {
      throw new ConflictError("This submission has already been reviewed");
    }

    if (!approve) {
      return this.prisma.taskCompletion.update({
        where: { id: taskCompletionId },
        data: { status: "rejected", rejectedReason, verifiedAt: new Date() },
      });
    }

    const updated = await this.prisma.taskCompletion.update({
      where: { id: taskCompletionId },
      data: { status: "verified", verifiedAt: new Date() },
    });
    await this.onVerified(completion.userId, completion.task);
    return updated;
  }

  private async onVerified(userId: string, task: { id: string; campaignId: string; rewardUsdcAmount: unknown; xpReward: number }) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: task.campaignId } });

    await this.rewardService.grant({
      userId,
      type: "task_reward",
      usdcAmount: task.rewardUsdcAmount!.toString(),
      xpAmount: task.xpReward,
      networkId: campaign.networkId,
      relatedTaskId: task.id,
      relatedCampaignId: task.campaignId,
    });

    await this.campaignService.checkAndCompleteCampaign(userId, task.campaignId);
  }

  private async upsertCompletion(
    userId: string,
    taskId: string,
    proof: string,
    status: "pending" | "verified" | "rejected",
  ) {
    return this.prisma.taskCompletion.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: { userId, taskId, proof, status, verifiedAt: status === "verified" ? new Date() : null },
      update: { proof, status, verifiedAt: status === "verified" ? new Date() : null },
    });
  }
}
