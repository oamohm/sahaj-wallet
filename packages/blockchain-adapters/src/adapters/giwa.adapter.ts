import type { NetworkConfig } from "@sahaj/shared-types";
import { EvmAdapter } from "./base-evm.adapter.js";

/**
 * Giwa is an optional, OP-Stack based EVM network. It is registered only
 * when GIWA_ENABLED=true so the platform can ship without it and turn it on
 * later purely through configuration.
 */
export class GiwaAdapter extends EvmAdapter {
  constructor(config: NetworkConfig) {
    super(config);
  }
}
