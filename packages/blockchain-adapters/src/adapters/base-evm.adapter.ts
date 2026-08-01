import { Contract, JsonRpcProvider, Wallet, formatUnits, isAddress, parseUnits } from "ethers";
import type { ContractTransactionResponse } from "ethers";
import type {
  NetworkConfig,
  TokenBalance,
  TransactionReceiptSummary,
  TransferRequest,
  TransferResult,
} from "@sahaj/shared-types";
import { ERC20_ABI, type IBlockchainAdapter } from "../types/adapter.types.js";

/**
 * ethers v6 types a bare `new Contract(address, humanReadableAbi, ...)`
 * call's dynamic methods loosely enough that strict mode flags them as
 * "possibly undefined" at every call site. Rather than sprinkle non-null
 * assertions through the adapter, we declare the exact shape once here and
 * cast to it right where the contract is constructed — every call site
 * downstream gets a real, fully-typed return value.
 */
interface Erc20Contract {
  balanceOf(owner: string): Promise<bigint>;
  decimals(): Promise<number>;
  symbol(): Promise<string>;
  transfer(to: string, amount: bigint): Promise<ContractTransactionResponse>;
}

/**
 * Concrete implementation of IBlockchainAdapter for any EVM-compatible
 * network (Arc, Ethereum, Base, Polygon, Arbitrum, Optimism, Giwa, and any
 * future EVM chain). Behavior is entirely driven by the injected
 * NetworkConfig, so adding a new EVM network never requires a new class —
 * only a new config entry. Non-EVM chains (if ever added) would implement
 * IBlockchainAdapter directly with their own class.
 */
export class EvmAdapter implements IBlockchainAdapter {
  public readonly networkId;
  public readonly config: NetworkConfig;
  protected readonly provider: JsonRpcProvider;

  constructor(config: NetworkConfig) {
    this.config = config;
    this.networkId = config.id;
    this.provider = new JsonRpcProvider(config.rpcUrl, config.chainId, {
      staticNetwork: true,
    });
  }

  isValidAddress(address: string): boolean {
    return isAddress(address);
  }

  async getNativeBalance(address: string): Promise<TokenBalance> {
    this.assertValidAddress(address);
    const raw = await this.provider.getBalance(address);
    return {
      networkId: this.networkId,
      address,
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
      raw: raw.toString(),
      formatted: formatUnits(raw, this.config.nativeCurrency.decimals),
    };
  }

  async getUsdcBalance(address: string): Promise<TokenBalance> {
    this.assertValidAddress(address);
    const token = new Contract(this.config.usdcAddress, ERC20_ABI, this.provider) as unknown as Erc20Contract;
    const [raw, decimals, symbol]: [bigint, number, string] = await Promise.all([
      token.balanceOf(address),
      token.decimals(),
      token.symbol(),
    ]);
    return {
      networkId: this.networkId,
      address,
      symbol,
      decimals,
      raw: raw.toString(),
      formatted: formatUnits(raw, decimals),
    };
  }

  async transferUsdc(request: TransferRequest, signerPrivateKey: string): Promise<TransferResult> {
    this.assertValidAddress(request.fromAddress);
    this.assertValidAddress(request.toAddress);

    const wallet = new Wallet(signerPrivateKey, this.provider);
    if (wallet.address.toLowerCase() !== request.fromAddress.toLowerCase()) {
      throw new Error("Signer does not match the requested fromAddress");
    }

    const token = new Contract(this.config.usdcAddress, ERC20_ABI, wallet) as unknown as Erc20Contract;
    const decimals: number = await token.decimals();
    const amount = parseUnits(request.amount, decimals);

    const tx = await token.transfer(request.toAddress, amount);
    const receipt = await tx.wait(1);

    return {
      networkId: this.networkId,
      txHash: tx.hash,
      status: receipt && receipt.status === 1 ? "confirmed" : "failed",
      explorerUrl: this.getExplorerTxUrl(tx.hash),
    };
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceiptSummary> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return {
        networkId: this.networkId,
        txHash,
        status: "pending",
        blockNumber: null,
        from: "",
        to: "",
        explorerUrl: this.getExplorerTxUrl(txHash),
      };
    }
    return {
      networkId: this.networkId,
      txHash,
      status: receipt.status === 1 ? "confirmed" : "failed",
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to ?? "",
      explorerUrl: this.getExplorerTxUrl(txHash),
    };
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  getExplorerAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/address/${address}`;
  }

  getExplorerTxUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  private assertValidAddress(address: string): void {
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid ${this.config.displayName} address: ${address}`);
    }
  }
}
