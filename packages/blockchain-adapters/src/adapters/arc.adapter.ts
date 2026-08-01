import type { NetworkConfig } from "@sahaj/shared-types";
import { EvmAdapter } from "./base-evm.adapter.js";

/**
 * Arc Network is EVM-compatible, but USDC has two interfaces there:
 *   - Native (used for gas, eth_getBalance, plain value transfers): 18 decimals
 *   - ERC-20 (balanceOf/transfer at 0x3600...0000, the config's usdcAddress): 6 decimals
 * Both read the same underlying balance via a precompile that keeps them in
 * sync — see https://docs.arc.io/arc/references/contract-addresses.
 *
 * Arc's own docs recommend apps rely on the ERC-20 interface for balances
 * and transfers, and that is exactly what the inherited EvmAdapter methods
 * do (they call balanceOf/transfer/decimals() on config.usdcAddress). So
 * this subclass needs no overrides for USDC at all — it exists as an
 * explicit extension point for any Arc-specific behavior that emerges
 * later (e.g. its built-in FX engine or opt-in privacy features), rather
 * than to special-case USDC handling.
 *
 * getNativeBalance() is still inherited unchanged and correctly reports the
 * native 18-decimal gas balance — useful for showing "how much gas do I
 * have left," which is a real and distinct question from "how much USDC do
 * I hold," even though both numbers currently move together on Arc.
 */
export class ArcAdapter extends EvmAdapter {
  constructor(config: NetworkConfig) {
    super(config);
  }
}
