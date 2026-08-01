import type {
  NetworkConfig,
  NetworkId,
  TokenBalance,
  TransactionReceiptSummary,
  TransferRequest,
  TransferResult,
} from "@sahaj/shared-types";

/**
 * The contract every network integration must satisfy. Nothing outside this
 * package (API routes, services, UI) is ever allowed to talk to a chain SDK
 * directly — everything goes through an IBlockchainAdapter obtained from the
 * AdapterRegistry. This is what keeps the platform blockchain-agnostic and
 * lets a new network be added without touching business logic.
 */
export interface IBlockchainAdapter {
  readonly networkId: NetworkId;
  readonly config: NetworkConfig;

  isValidAddress(address: string): boolean;

  getNativeBalance(address: string): Promise<TokenBalance>;

  getUsdcBalance(address: string): Promise<TokenBalance>;

  transferUsdc(request: TransferRequest, signerPrivateKey: string): Promise<TransferResult>;

  getTransactionReceipt(txHash: string): Promise<TransactionReceiptSummary>;

  getBlockNumber(): Promise<number>;

  getExplorerAddressUrl(address: string): string;

  getExplorerTxUrl(txHash: string): string;
}

/** Minimal ERC-20 surface needed for USDC balance/transfer operations. */
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;
