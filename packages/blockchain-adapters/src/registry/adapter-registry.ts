import type { NetworkConfig, NetworkId } from "@sahaj/shared-types";
import type { IBlockchainAdapter } from "../types/adapter.types.js";
import { EvmAdapter } from "../adapters/base-evm.adapter.js";
import { ArcAdapter } from "../adapters/arc.adapter.js";
import { GiwaAdapter } from "../adapters/giwa.adapter.js";
import { loadNetworkConfigs } from "../config/networks.config.js";

type AdapterFactory = (config: NetworkConfig) => IBlockchainAdapter;

/**
 * Maps a network id to the adapter class responsible for it. This is the
 * only place in the codebase that knows about concrete adapter classes.
 * Everything else (API routes, services, the frontend) depends only on
 * IBlockchainAdapter obtained through AdapterRegistry.get(). Adding a new
 * network is: (1) add a NetworkConfig entry, (2) optionally add a row here
 * if it needs custom behavior, otherwise it falls back to EvmAdapter.
 */
const ADAPTER_FACTORIES: Partial<Record<NetworkId, AdapterFactory>> = {
  arc: (config) => new ArcAdapter(config),
  giwa: (config) => new GiwaAdapter(config),
};

export class AdapterRegistry {
  private readonly adapters = new Map<NetworkId, IBlockchainAdapter>();

  constructor(configs: Record<NetworkId, NetworkConfig> = loadNetworkConfigs()) {
    for (const config of Object.values(configs)) {
      if (!config.enabled) continue;
      const factory = ADAPTER_FACTORIES[config.id] ?? ((c: NetworkConfig) => new EvmAdapter(c));
      this.adapters.set(config.id, factory(config));
    }
  }

  get(networkId: NetworkId): IBlockchainAdapter {
    const adapter = this.adapters.get(networkId);
    if (!adapter) {
      throw new Error(`No enabled adapter registered for network: ${networkId}`);
    }
    return adapter;
  }

  has(networkId: NetworkId): boolean {
    return this.adapters.has(networkId);
  }

  listEnabledNetworks(): NetworkConfig[] {
    return Array.from(this.adapters.values()).map((a) => a.config);
  }

  getDefaultAdapter(): IBlockchainAdapter {
    const found = Array.from(this.adapters.values()).find((a) => a.config.isDefault);
    if (found) return found;
    const arc = this.adapters.get("arc");
    if (arc) return arc;
    const first = this.adapters.values().next().value;
    if (!first) throw new Error("No adapters are enabled");
    return first;
  }
}

/** Process-wide singleton so RPC providers and connections are reused. */
let singleton: AdapterRegistry | null = null;

export function getAdapterRegistry(): AdapterRegistry {
  if (!singleton) {
    singleton = new AdapterRegistry();
  }
  return singleton;
}
