import type { PrismaClient } from "@sahaj/database";
import type { AdapterRegistry } from "@sahaj/blockchain-adapters";
import type { CircleUsdcService } from "@sahaj/circle-sdk";
import type { NetworkConfig, NetworkId, TokenBalance } from "@sahaj/shared-types";
import { ConflictError, NotFoundError } from "../../errors/app-error.js";
import type { LinkWalletInput } from "../../validators/wallet.validator.js";

export class WalletService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly adapters: AdapterRegistry,
    private readonly circleUsdc: CircleUsdcService,
  ) {}

  listNetworks(): NetworkConfig[] {
    return this.adapters.listEnabledNetworks();
  }

  /** Reads live on-chain balances directly from the network — no DB involved. */
  async getOnChainBalances(networkId: NetworkId, address: string) {
    const adapter = this.adapters.get(networkId);
    const [native, usdc] = await Promise.all([
      adapter.getNativeBalance(address),
      adapter.getUsdcBalance(address),
    ]);
    return { native, usdc };
  }

  async linkWallet(userId: string, input: LinkWalletInput) {
    const existing = await this.prisma.walletAccount.findUnique({
      where: { networkId_address: { networkId: input.networkId, address: input.address.toLowerCase() } },
    });
    if (existing) {
      throw new ConflictError("This wallet address is already linked");
    }

    if (input.isPrimary) {
      await this.prisma.walletAccount.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.walletAccount.create({
      data: {
        userId,
        networkId: input.networkId,
        address: input.address.toLowerCase(),
        provider: input.provider,
        isPrimary: input.isPrimary,
      },
    });
  }

  async listUserWallets(userId: string) {
    return this.prisma.walletAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createCircleWallet(userId: string, networkId: NetworkId) {
    const record = await this.circleUsdc.createWallet(userId, networkId);
    return this.prisma.walletAccount.create({
      data: {
        userId,
        networkId,
        address: record.address.toLowerCase(),
        provider: "circle",
        circleWalletId: record.circleWalletId,
        isPrimary: false,
      },
    });
  }

  /** Unified USDC balance across every Circle-managed wallet the user owns. */
  async getUnifiedCircleBalance(userId: string): Promise<{ totalUsdc: string; wallets: TokenBalance[] }> {
    const circleWallets = await this.prisma.walletAccount.findMany({
      where: { userId, provider: "circle", circleWalletId: { not: null } },
    });

    if (circleWallets.length === 0) {
      return { totalUsdc: "0", wallets: [] };
    }

    const balances = await Promise.all(
      circleWallets.map(async (w) => {
        const balance = await this.circleUsdc.getUsdcBalance(w.circleWalletId as string, w.networkId as NetworkId);
        return { ...balance, address: w.address };
      }),
    );

    const totalUsdc = balances
      .reduce((sum, b) => sum + Number(b.formatted || "0"), 0)
      .toFixed(6);

    return { totalUsdc, wallets: balances };
  }

  /**
   * External-wallet sends are signed entirely client-side (MetaMask,
   * WalletConnect) — the backend never sees a private key. This just
   * independently verifies the resulting transaction against the chain via
   * the adapter and confirms it originates from a wallet the user has
   * linked, so reward/task flows can trust it.
   */
  async recordExternalTransaction(userId: string, networkId: NetworkId, txHash: string) {
    const adapter = this.adapters.get(networkId);
    const receipt = await adapter.getTransactionReceipt(txHash);

    const linkedWallet = await this.prisma.walletAccount.findFirst({
      where: { userId, networkId, address: receipt.from.toLowerCase() },
    });

    return {
      ...receipt,
      verifiedAgainstLinkedWallet: Boolean(linkedWallet),
    };
  }

  async sendUsdcFromCircleWallet(userId: string, params: {
    circleWalletId: string;
    destinationAddress: string;
    amount: string;
    networkId: NetworkId;
  }) {
    const wallet = await this.prisma.walletAccount.findFirst({
      where: { userId, circleWalletId: params.circleWalletId },
    });
    if (!wallet) {
      throw new NotFoundError("Circle wallet");
    }

    return this.circleUsdc.sendUsdc(params);
  }
}
