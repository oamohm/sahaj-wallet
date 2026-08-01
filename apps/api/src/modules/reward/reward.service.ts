import type { PrismaClient, RewardEventType } from "@sahaj/database";
import type { CircleUsdcService } from "@sahaj/circle-sdk";
import type { NetworkId, Paginated, RewardsBalance } from "@sahaj/shared-types";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/app-error.js";
import { levelForXp } from "../../utils/leveling.js";

export interface GrantRewardParams {
  userId: string;
  type: RewardEventType;
  usdcAmount: string;
  xpAmount?: number;
  networkId: NetworkId;
  relatedTaskId?: string;
  relatedCampaignId?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * The single write path for every USDC/XP reward in the platform. Task
 * completions, campaign bonuses, referral payouts, and manual admin grants
 * all funnel through `grant()` so the reward ledger (and the XP/level
 * side-effect on User) can never drift out of sync with the rest of the
 * system.
 */
export class RewardService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly circleUsdc: CircleUsdcService,
    private readonly treasuryCircleWalletId: string | undefined,
  ) {}

  async grant(params: GrantRewardParams): Promise<void> {
    const xpAmount = params.xpAmount ?? 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.rewardEvent.create({
        data: {
          userId: params.userId,
          type: params.type,
          usdcAmount: params.usdcAmount,
          xpAmount,
          networkId: params.networkId,
          relatedTaskId: params.relatedTaskId,
          relatedCampaignId: params.relatedCampaignId,
          metadata: params.metadata ?? undefined,
        },
      });

      if (xpAmount > 0) {
        const user = await tx.user.update({
          where: { id: params.userId },
          data: { xp: { increment: xpAmount } },
        });
        const newLevel = levelForXp(user.xp);
        if (newLevel !== user.level) {
          await tx.user.update({ where: { id: params.userId }, data: { level: newLevel } });
        }
      }
    });
  }

  async getBalance(userId: string): Promise<RewardsBalance> {
    const [earnedAgg, claimedAgg] = await Promise.all([
      this.prisma.rewardEvent.aggregate({
        where: { userId },
        _sum: { usdcAmount: true },
      }),
      this.prisma.rewardClaim.aggregate({
        where: { userId, status: { in: ["pending", "processing", "paid"] } },
        _sum: { usdcAmount: true },
      }),
    ]);

    const totalUsdcEarned = Number(earnedAgg._sum.usdcAmount ?? 0);
    const totalUsdcClaimed = Number(claimedAgg._sum.usdcAmount ?? 0);
    const claimableUsdc = Math.max(0, totalUsdcEarned - totalUsdcClaimed);

    return {
      userId,
      totalUsdcEarned: totalUsdcEarned.toFixed(6),
      totalUsdcClaimed: totalUsdcClaimed.toFixed(6),
      claimableUsdc: claimableUsdc.toFixed(6),
    };
  }

  async listHistory(userId: string, page: number, pageSize: number): Promise<Paginated<Record<string, unknown>>> {
    const [items, total] = await Promise.all([
      this.prisma.rewardEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rewardEvent.count({ where: { userId } }),
    ]);

    return { items, page, pageSize, total };
  }

  /**
   * Creates a claim request and, if a treasury Circle wallet is configured,
   * immediately initiates the USDC payout. The claim starts `pending` and
   * moves to `processing`/`paid`/`failed` as the Circle transaction settles.
   */
  async claim(userId: string, usdcAmount: string, networkId: NetworkId, destinationAddress: string) {
    const balance = await this.getBalance(userId);
    if (Number(usdcAmount) > Number(balance.claimableUsdc)) {
      throw new ValidationError("Claim amount exceeds claimable balance");
    }

    const claim = await this.prisma.rewardClaim.create({
      data: { userId, usdcAmount, networkId, destinationAddress, status: "pending" },
    });

    if (!this.treasuryCircleWalletId) {
      // No treasury wallet configured (e.g. local/dev) — leave the claim
      // pending for manual/ops processing rather than silently failing.
      return claim;
    }

    try {
      const result = await this.circleUsdc.sendUsdc({
        circleWalletId: this.treasuryCircleWalletId,
        destinationAddress,
        amount: usdcAmount,
        networkId,
      });

      return this.prisma.rewardClaim.update({
        where: { id: claim.id },
        data: { status: "processing", txHash: result.txHash },
      });
    } catch (error) {
      return this.prisma.rewardClaim.update({
        where: { id: claim.id },
        data: { status: "failed", failureReason: error instanceof Error ? error.message : "Unknown error" },
      });
    }
  }

  async listClaims(userId: string) {
    return this.prisma.rewardClaim.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async getClaimStatus(claimId: string, userId: string) {
    const claim = await this.prisma.rewardClaim.findUnique({ where: { id: claimId } });
    if (!claim || claim.userId !== userId) throw new NotFoundError("Reward claim");
    if (claim.status !== "processing" || !claim.txHash) return claim;

    const circleStatus = await this.circleUsdc.getTransactionStatus(claim.txHash);
    if (circleStatus === "confirmed") {
      return this.prisma.rewardClaim.update({
        where: { id: claim.id },
        data: { status: "paid", paidAt: new Date() },
      });
    }
    if (circleStatus === "failed") {
      return this.prisma.rewardClaim.update({
        where: { id: claim.id },
        data: { status: "failed", failureReason: "Circle transaction failed" },
      });
    }
    return claim;
  }
}

export { ConflictError };
