/**
 * @sahaj/shared-types
 * Framework-agnostic types shared across the API, web app, and blockchain
 * adapter layer. This package has zero runtime dependencies by design so it
 * can be imported anywhere without pulling in server or browser specifics.
 */

/** Canonical identifier for every network the platform knows how to speak to. */
export type NetworkId =
  | "arc"
  | "ethereum"
  | "base"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "giwa";

export type NetworkFamily = "evm";

export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

/** Static configuration describing how to talk to a given network. */
export interface NetworkConfig {
  id: NetworkId;
  family: NetworkFamily;
  displayName: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: string;
  nativeCurrency: NativeCurrency;
  isDefault: boolean;
  isTestnet: boolean;
  enabled: boolean;
  /** Public faucet page users can visit manually. Null for mainnets. */
  faucetUrl: string | null;
  /**
   * True only for a chain where USDC has no ERC-20 interface at all and a
   * "USDC transfer" must be a native value transfer. None of the currently
   * supported networks need this — Arc's USDC is native for gas but also
   * exposes a standard ERC-20 interface that Arc's own docs recommend
   * using for app-level balances/transfers, so Arc adapters use that path
   * like every other EVM chain. Kept as an explicit config flag (rather
   * than an EVM-chain default forever) for any future non-standard chain
   * that genuinely has no ERC-20 USDC interface.
   */
  usdcIsNative: boolean;
}

export interface TokenBalance {
  networkId: NetworkId;
  address: string;
  symbol: string;
  decimals: number;
  raw: string;
  formatted: string;
}

export type TransactionStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "unknown";

export interface TransferRequest {
  networkId: NetworkId;
  fromAddress: string;
  toAddress: string;
  /** Human-readable amount, e.g. "12.50" */
  amount: string;
}

export interface TransferResult {
  networkId: NetworkId;
  txHash: string;
  status: TransactionStatus;
  explorerUrl: string;
}

export interface TransactionReceiptSummary {
  networkId: NetworkId;
  txHash: string;
  status: TransactionStatus;
  blockNumber: number | null;
  from: string;
  to: string;
  explorerUrl: string;
}

/** Domain model for a platform user's non-custodial or Circle-managed wallet. */
export interface WalletAccount {
  id: string;
  userId: string;
  networkId: NetworkId;
  address: string;
  circleWalletId: string | null;
  createdAt: string;
}

export type RewardEventType =
  | "signup_bonus"
  | "first_transfer"
  | "referral"
  | "streak"
  | "manual_grant";

export interface RewardEvent {
  id: string;
  userId: string;
  type: RewardEventType;
  usdcAmount: string;
  networkId: NetworkId;
  createdAt: string;
  metadata: Record<string, string | number | boolean> | null;
}

export interface RewardsBalance {
  userId: string;
  totalUsdcEarned: string;
  totalUsdcClaimed: string;
  claimableUsdc: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
