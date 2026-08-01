import type { PrismaClient } from "@sahaj/database";
import type { Paginated } from "@sahaj/shared-types";
import { ConflictError, NotFoundError } from "../../errors/app-error.js";
import type { CreateCampaignInput, ListCampaignsQuery } from "../../validators/campaign.validator.js";
import { RewardService } from "../reward/reward.service.js";

export class CampaignService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly rewardService: RewardService,
  ) {}

  async create(input: CreateCampaignInput) {
    return this.prisma.campaign.create({
      data: {
        title: input.title,
        description: input.description,
        networkId: input.networkId,
        rewardUsdcAmount: input.rewardUsdcAmount,
        xpReward: input.xpReward,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: "draft",
      },
    });
  }

  async publish(campaignId: string) {
    return this.setStatus(campaignId, "active");
  }

  async archive(campaignId: string) {
    return this.setStatus(campaignId, "archived");
  }

  async list(query: ListCampaignsQuery): Promise<Paginated<Record<string, unknown>>> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { startsAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { tasks: true, _count: { select: { participants: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async getById(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { tasks: true },
    });
    if (!campaign) throw new NotFoundError("Campaign");
    return campaign;
  }

  async join(userId: string, campaignId: string) {
    const campaign = await this.getById(campaignId);
    if (campaign.status !== "active") {
      throw new ConflictError("This campaign is not currently active");
    }

    const existing = await this.prisma.campaignParticipant.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
    });
    if (existing) throw new ConflictError("You have already joined this campaign");

    return this.prisma.campaignParticipant.create({
      data: { userId, campaignId, status: "joined" },
    });
  }

  async getUserProgress(userId: string, campaignId: string) {
    const campaign = await this.getById(campaignId);
    const completions = await this.prisma.taskCompletion.findMany({
      where: { userId, taskId: { in: campaign.tasks.map((t) => t.id) } },
    });

    const tasksWithStatus = campaign.tasks.map((task) => ({
      ...task,
      completion: completions.find((c) => c.taskId === task.id) ?? null,
    }));

    const requiredTasks = campaign.tasks.filter((t) => t.isRequired);
    const verifiedRequired = requiredTasks.filter((t) =>
      completions.some((c) => c.taskId === t.id && c.status === "verified"),
    );

    return {
      campaign,
      tasks: tasksWithStatus,
      isComplete: requiredTasks.length > 0 && verifiedRequired.length === requiredTasks.length,
    };
  }

  /**
   * Called after any task is verified for a user. If every required task in
   * the campaign is now verified, marks the participant completed and pays
   * out the campaign-level bonus reward exactly once.
   */
  async checkAndCompleteCampaign(userId: string, campaignId: string): Promise<void> {
    const progress = await this.getUserProgress(userId, campaignId);
    if (!progress.isComplete) return;

    const participant = await this.prisma.campaignParticipant.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
    });
    if (!participant || participant.status === "completed") return;

    await this.prisma.campaignParticipant.update({
      where: { id: participant.id },
      data: { status: "completed", completedAt: new Date() },
    });

    await this.rewardService.grant({
      userId,
      type: "campaign_reward",
      usdcAmount: progress.campaign.rewardUsdcAmount.toString(),
      xpAmount: progress.campaign.xpReward,
      networkId: progress.campaign.networkId,
      relatedCampaignId: campaignId,
    });
  }

  private async setStatus(campaignId: string, status: "active" | "archived") {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundError("Campaign");
    return this.prisma.campaign.update({ where: { id: campaignId }, data: { status } });
  }
}
