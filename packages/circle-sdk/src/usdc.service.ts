import type { NetworkId, TokenBalance, TransferResult } from "@sahaj/shared-types";
import type { CircleClient, CircleEnvironment } from "./circle-client.js";
import { toCircleBlockchain } from "./circle-client.js";

export interface CircleWalletRecord {
  circleWalletId: string;
  address: string;
  networkId: NetworkId;
  walletSetId: string;
}

/**
 * Wraps Circle's developer-controlled wallets API behind the platform's own
 * vocabulary (create wallet, unified balance, send USDC). This is the
 * "Circle App Kit as default payment abstraction" layer described in the
 * platform constitution: business logic (rewards, campaigns, tasks) calls
 * these methods and never touches the Circle SDK directly, so additional
 * Circle capabilities (bridge, swap) can be added here without changing
 * any calling code.
 */
export class CircleUsdcService {
  constructor(
    private readonly client: CircleClient,
    private readonly environment: CircleEnvironment,
  ) {}

  /**
   * Creates (or reuses) a wallet set for a platform user, then provisions a
   * developer-controlled wallet on the requested network.
   */
  async createWallet(userId: string, networkId: NetworkId): Promise<CircleWalletRecord> {
    const blockchain = toCircleBlockchain(networkId, this.environment);

    const walletSetResponse = await this.client.createWalletSet({
      name: `sahaj-user-${userId}`,
    });
    const walletSetId = walletSetResponse.data?.walletSet?.id;
    if (!walletSetId) {
      throw new Error("Circle did not return a wallet set id");
    }

    const walletsResponse = await this.client.createWallets({
      walletSetId,
      blockchains: [blockchain as never],
      accountType: "SCA",
      count: 1,
    });

    const wallet = walletsResponse.data?.wallets?.[0];
    if (!wallet?.id || !wallet.address) {
      throw new Error("Circle did not return a provisioned wallet");
    }

    return {
      circleWalletId: wallet.id,
      address: wallet.address,
      networkId,
      walletSetId,
    };
  }

  /**
   * USDC balance for a single Circle-managed wallet. `networkId` is passed
   * in by the caller (from our own WalletAccount record) purely for
   * labeling the result — Circle's balance response doesn't need it, since
   * the wallet ID alone is already scoped to one blockchain on Circle's side.
   */
  async getUsdcBalance(circleWalletId: string, networkId: NetworkId): Promise<TokenBalance & { networkId: NetworkId }> {
    const usdcEntry = await this.findUsdcTokenBalance(circleWalletId);

    return {
      networkId,
      address: circleWalletId,
      symbol: "USDC",
      decimals: 6,
      raw: usdcEntry ? String(Math.round(Number(usdcEntry.amount) * 1_000_000)) : "0",
      formatted: usdcEntry?.amount ?? "0",
    };
  }

  /**
   * Sums USDC across every Circle-managed wallet a user owns — the
   * "Unified Balance" experience described in the constitution.
   */
  async getUnifiedUsdcBalance(circleWallets: { circleWalletId: string; networkId: NetworkId }[]): Promise<string> {
    const balances = await Promise.all(circleWallets.map((w) => this.getUsdcBalance(w.circleWalletId, w.networkId)));
    const total = balances.reduce((sum, b) => sum + Number(b.formatted || "0"), 0);
    return total.toFixed(6);
  }

  async sendUsdc(params: {
    circleWalletId: string;
    destinationAddress: string;
    amount: string;
    networkId: NetworkId;
  }): Promise<TransferResult> {
    // Circle's transfer API needs the specific USDC *token resource* id on
    // this wallet's blockchain (a UUID, not the literal string "USDC") —
    // we discover it the same way Circle's own docs do: look it up from
    // the wallet's own token balances rather than hardcoding a UUID that
    // would silently drift out of date.
    const usdcEntry = await this.findUsdcTokenBalance(params.circleWalletId);
    if (!usdcEntry?.token?.id) {
      throw new Error("Could not resolve a USDC token id for this Circle wallet — does it hold any USDC yet?");
    }

    const response = await this.client.createTransaction({
      walletId: params.circleWalletId,
      destinationAddress: params.destinationAddress,
      tokenId: usdcEntry.token.id,
      amount: [params.amount],
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
    });

    const txId = response.data?.id;
    if (!txId) {
      throw new Error("Circle did not return a transaction id");
    }

    return {
      networkId: params.networkId,
      txHash: txId,
      status: "pending",
      explorerUrl: "",
    };
  }

  /** Looks up a Circle-managed wallet's on-chain address directly from Circle (not our own DB) — used e.g. to resolve the treasury wallet's address for inbound transfers. */
  async getWalletAddress(circleWalletId: string): Promise<string> {
    const response = await this.client.getWallet({ id: circleWalletId });
    const address = response.data?.wallet?.address;
    if (!address) {
      throw new Error(`Circle did not return an address for wallet ${circleWalletId}`);
    }
    return address;
  }

  async getTransactionStatus(transactionId: string): Promise<"pending" | "confirmed" | "failed"> {
    const response = await this.client.getTransaction({ id: transactionId });
    const state = response.data?.transaction?.state;
    if (state === "COMPLETE") return "confirmed";
    if (state === "FAILED" || state === "CANCELLED" || state === "DENIED") return "failed";
    return "pending";
  }

  private async findUsdcTokenBalance(circleWalletId: string) {
    const response = await this.client.getWalletTokenBalance({ id: circleWalletId });
    return response.data?.tokenBalances?.find((entry) => entry.token?.symbol === "USDC");
  }
}
