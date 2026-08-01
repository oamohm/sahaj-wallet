import type { PrismaClient } from "@sahaj/database";
import type { CircleUsdcService } from "@sahaj/circle-sdk";
import type { NetworkId } from "@sahaj/shared-types";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/app-error.js";
import { DAYS_PER_YEAR, STAKE_TERMS } from "../../constants/index.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function apyBpsForLockDays(lockDays: number): number {
  const term = STAKE_TERMS.find((t) => t.lockDays === lockDays);
  if (!term) throw new ValidationError(`Unsupported lock term: ${lockDays} days`);
  return term.apyBps;
}

/** principal * apyBps/10000 * lockDays/365, rounded to 6 decimal places (USDC precision). */
function computeYield(principalUsdc: string, apyBps: number, lockDays: number): string {
  const yieldAmount = (Number(principalUsdc) * apyBps) / 10_000 * (lockDays / DAYS_PER_YEAR);
  return yieldAmount.toFixed(6);
}

/**
 * Fixed-term USDC staking: principal moves from the user's Circle wallet
 * into the platform treasury for the chosen lock period at a fixed,
 * published APY, then principal + yield moves back on withdrawal after
 * maturity. Demonstrates Arc's "predictable, USDC-denominated yield"
 * pitch on testnet — this is a demo yield product funded by the treasury
 * wallet, not a real lending market, and the code never claims otherwise.
 */
export class StakeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly circleUsdc: CircleUsdcService,
    private readonly treasuryCircleWalletId: string | undefined,
  ) {}

  async createStake(
    userId: string,
    networkId: NetworkId,
    sourceWalletId: string,
    principalUsdc: string,
    lockDays: number,
  ) {
    if (!this.treasuryCircleWalletId) {
      throw new ValidationError("Staking is not available on this deployment yet (no treasury wallet configured)");
    }
    if (Number(principalUsdc) <= 0) {
      throw new ValidationError("principalUsdc must be greater than zero");
    }

    const wallet = await this.prisma.walletAccount.findFirst({
      where: { id: sourceWalletId, userId, provider: "circle", networkId },
    });
    if (!wallet || !wallet.circleWalletId) {
      throw new NotFoundError("Circle-managed wallet");
    }

    const apyBps = apyBpsForLockDays(lockDays);

    // Move principal into the treasury first — a stake only exists once the
    // funds have actually been locked, never speculatively.
    const transfer = await this.circleUsdc.sendUsdc({
      circleWalletId: wallet.circleWalletId,
      destinationAddress: await this.treasuryAddress(),
      amount: principalUsdc,
      networkId,
    });

    const maturesAt = new Date(Date.now() + lockDays * MS_PER_DAY);

    return this.prisma.stakePosition.create({
      data: {
        userId,
        networkId,
        sourceWalletId,
        principalUsdc,
        apyBps,
        lockDays,
        status: "active",
        principalTxHash: transfer.txHash,
        maturesAt,
      },
    });
  }

  async listPositions(userId: string) {
    return this.prisma.stakePosition.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
    });
  }

  /** Projected yield for a not-yet-created stake, for the UI to preview before confirming. */
  previewYield(principalUsdc: string, lockDays: number) {
    const apyBps = apyBpsForLockDays(lockDays);
    return { apyBps, projectedYieldUsdc: computeYield(principalUsdc, apyBps, lockDays) };
  }

  async withdraw(userId: string, positionId: string) {
    const position = await this.prisma.stakePosition.findUnique({ where: { id: positionId } });
    if (!position || position.userId !== userId) throw new NotFoundError("Stake position");
    if (position.status !== "active") {
      throw new ConflictError(`Stake is already ${position.status}`);
    }
    if (position.maturesAt.getTime() > Date.now()) {
      throw new ValidationError(`This stake matures on ${position.maturesAt.toISOString()} — not yet withdrawable`);
    }
    if (!this.treasuryCircleWalletId) {
      throw new ValidationError("Staking payouts are not available on this deployment yet (no treasury wallet configured)");
    }

    const wallet = await this.prisma.walletAccount.findUnique({ where: { id: position.sourceWalletId } });
    if (!wallet) throw new NotFoundError("Original staking wallet");

    const yieldUsdc = computeYield(position.principalUsdc, position.apyBps, position.lockDays);
    const payout = (Number(position.principalUsdc) + Number(yieldUsdc)).toFixed(6);

    try {
      const transfer = await this.circleUsdc.sendUsdc({
        circleWalletId: this.treasuryCircleWalletId,
        destinationAddress: wallet.address,
        amount: payout,
        networkId: position.networkId as NetworkId,
      });

      return this.prisma.stakePosition.update({
        where: { id: position.id },
        data: {
          status: "withdrawn",
          yieldUsdc,
          withdrawalTxHash: transfer.txHash,
          withdrawnAt: new Date(),
        },
      });
    } catch (error) {
      return this.prisma.stakePosition.update({
        where: { id: position.id },
        data: {
          status: "failed",
          failureReason: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  private async treasuryAddress(): Promise<string> {
    if (!this.treasuryCircleWalletId) {
      throw new ValidationError("No treasury wallet configured");
    }
    return this.circleUsdc.getWalletAddress(this.treasuryCircleWalletId);
  }
}
