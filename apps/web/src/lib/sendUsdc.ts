import { Contract, parseUnits, type JsonRpcSigner } from "ethers";
import { ERC20_ABI } from "@sahaj/blockchain-adapters";
import type { NetworkConfig } from "@sahaj/shared-types";

/**
 * ethers v6 types a bare `new Contract(address, humanReadableAbi, ...)`
 * call's dynamic methods loosely enough that strict mode flags them as
 * "possibly undefined". Casting through this standalone interface (kept in
 * sync with the same shape used in @sahaj/blockchain-adapters) gives real,
 * fully-typed calls instead.
 */
interface Erc20Contract {
  decimals(): Promise<bigint>;
  transfer(to: string, amount: bigint): Promise<{ hash: string }>;
}

/**
 * Sends USDC from the connected browser wallet. The signer comes straight
 * from window.ethereum (MetaMask/WalletConnect) — signing happens entirely
 * client-side and the private key never leaves the extension, let alone
 * reaches our backend. The backend only ever sees the resulting hash via
 * POST /wallet/record-tx for verification/history.
 */
export async function sendUsdcExternal(signer: JsonRpcSigner, network: NetworkConfig, toAddress: string, amount: string): Promise<string> {
  if (network.usdcIsNative) {
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parseUnits(amount, network.nativeCurrency.decimals),
    });
    return tx.hash;
  }

  const token = new Contract(network.usdcAddress, ERC20_ABI, signer) as unknown as Erc20Contract;
  const decimals = await token.decimals();
  const tx = await token.transfer(toAddress, parseUnits(amount, Number(decimals)));
  return tx.hash;
}
