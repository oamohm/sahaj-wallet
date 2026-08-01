import type { NetworkConfig, NetworkId, RewardsBalance, TokenBalance, TransactionReceiptSummary } from "@sahaj/shared-types";
import { api } from "./client";

// ---- Auth -------------------------------------------------------------

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; address: string; email: string | null; role: "user" | "admin" };
}

export const authApi = {
  requestNonce: (address: string, networkId: NetworkId) =>
    api.post<{ nonce: string; expiresAt: string }>("/auth/nonce", { address, networkId }, { auth: false }),

  verify: (address: string, nonce: string, signature: string, networkId: NetworkId) =>
    api.post<AuthSession>("/auth/verify", { address, nonce, signature, networkId }, { auth: false }),

  refresh: (refreshToken: string) => api.post<AuthSession>("/auth/refresh", { refreshToken }, { auth: false }),

  logout: (refreshToken: string) => api.post<void>("/auth/logout", { refreshToken }, { auth: false }),

  me: () => api.get<{ id: string; address: string; email: string | null; role: string; createdAt: string }>("/auth/me"),
};

// ---- Wallet -------------------------------------------------------------

export const walletApi = {
  listNetworks: () => api.getPublic<{ networks: NetworkConfig[] }>("/wallet/networks"),

  getBalance: (networkId: NetworkId, address: string) =>
    api.getPublic<{ native: TokenBalance; usdc: TokenBalance }>("/wallet/balance", { networkId, address }),

  listMine: () =>
    api.get<{ wallets: { id: string; networkId: NetworkId; address: string; provider: string; circleWalletId: string | null }[] }>(
      "/wallet/mine",
    ),

  link: (networkId: NetworkId, address: string, provider: "metamask" | "walletconnect" | "coinbase", isPrimary = false) =>
    api.post("/wallet/link", { networkId, address, provider, isPrimary }),

  recordExternalTx: (networkId: NetworkId, txHash: string) =>
    api.post<TransactionReceiptSummary & { verifiedAgainstLinkedWallet: boolean }>("/wallet/record-tx", { networkId, txHash }),

  createCircleWallet: (networkId: NetworkId) =>
    api.post<{ id: string; networkId: NetworkId; address: string; circleWalletId: string }>("/wallet/circle/wallets", { networkId }),

  getUnifiedCircleBalance: () => api.get<{ totalUsdc: string; wallets: TokenBalance[] }>("/wallet/circle/balance"),

  sendFromCircle: (circleWalletId: string, destinationAddress: string, amount: string, networkId: NetworkId) =>
    api.post<{ id: string; status: string }>("/wallet/circle/send", { circleWalletId, destinationAddress, amount, networkId }),
};

// ---- Faucet -------------------------------------------------------------

export interface FaucetResult {
  mode: "dispensed" | "manual";
  message: string;
  faucetUrl: string | null;
}

export const faucetApi = {
  request: (networkId: "arc" | "giwa", address: string) => api.post<FaucetResult>("/faucet", { networkId, address }),
};

// ---- Stake (fixed-term USDC yield) -------------------------------------

export interface StakeTerm {
  lockDays: number;
  apyBps: number;
}

export interface StakePosition {
  id: string;
  networkId: NetworkId;
  sourceWalletId: string;
  principalUsdc: string;
  apyBps: number;
  lockDays: number;
  status: "active" | "withdrawn" | "failed";
  principalTxHash: string | null;
  withdrawalTxHash: string | null;
  yieldUsdc: string | null;
  failureReason: string | null;
  startedAt: string;
  maturesAt: string;
  withdrawnAt: string | null;
}

export const stakeApi = {
  getTerms: () => api.getPublic<{ terms: StakeTerm[] }>("/stake/terms"),
  create: (networkId: NetworkId, sourceWalletId: string, principalUsdc: string, lockDays: number) =>
    api.post<StakePosition>("/stake", { networkId, sourceWalletId, principalUsdc, lockDays }),
  list: () => api.get<{ positions: StakePosition[] }>("/stake"),
  withdraw: (positionId: string) => api.post<StakePosition>(`/stake/${positionId}/withdraw`),
};

// ---- Rewards -------------------------------------------------------------

export interface RewardEventItem {
  id: string;
  type: string;
  usdcAmount: string;
  xpAmount: number;
  networkId: NetworkId;
  createdAt: string;
}

export interface RewardClaimItem {
  id: string;
  usdcAmount: string;
  networkId: NetworkId;
  destinationAddress: string;
  status: "pending" | "processing" | "paid" | "failed";
  txHash: string | null;
  failureReason: string | null;
  createdAt: string;
}

export const rewardApi = {
  getBalance: () => api.get<RewardsBalance>("/rewards/balance"),
  getHistory: (page = 1, pageSize = 20) =>
    api.get<{ items: RewardEventItem[]; page: number; pageSize: number; total: number }>("/rewards/history", { page, pageSize }),
  claim: (usdcAmount: string, networkId: NetworkId, destinationAddress: string) =>
    api.post<RewardClaimItem>("/rewards/claims", { usdcAmount, networkId, destinationAddress }),
  listClaims: () => api.get<{ claims: RewardClaimItem[] }>("/rewards/claims"),
  getClaimStatus: (claimId: string) => api.get<RewardClaimItem>(`/rewards/claims/${claimId}`),
};
