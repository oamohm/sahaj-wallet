import type { NetworkConfig, NetworkId } from "@sahaj/shared-types";

/**
 * Minimal env accessor duplicated here (rather than imported from apps/api)
 * so this package has no dependency on any particular server framework.
 */
function readEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

/**
 * Builds the full set of network configurations from environment variables.
 * This is the single source of truth for "which networks exist and how do
 * we reach them" — adapters are constructed from this, never from literals
 * scattered around the codebase.
 */
export function loadNetworkConfigs(): Record<NetworkId, NetworkConfig> {
  const defaultNetwork = (process.env.DEFAULT_NETWORK ?? "arc") as NetworkId;

  const configs: Record<NetworkId, NetworkConfig> = {
    arc: {
      id: "arc",
      family: "evm",
      displayName: "Arc Network",
      chainId: Number(readEnv("ARC_CHAIN_ID", "5042002")),
      rpcUrl: readEnv("ARC_RPC_URL"),
      explorerUrl: readEnv("ARC_EXPLORER_URL", "https://testnet.arcscan.app"),
      // Arc's USDC system contract exposes an ERC-20 interface (6 decimals)
      // backed by the same balance as the native gas token (18 decimals).
      // Arc's own docs recommend apps use this ERC-20 interface for
      // balances/transfers and reserve the native interface for gas —
      // see https://docs.arc.io/arc/references/contract-addresses.
      usdcAddress: readEnv("ARC_USDC_ADDRESS", "0x3600000000000000000000000000000000000000"),
      // The native currency IS USDC on Arc, but at 18 decimals of
      // precision (matching EVM gas-accounting convention) — NOT the same
      // 6 decimals as the ERC-20 interface above. Mixing the two up is
      // Arc's most common integration mistake; see ArcAdapter for how we
      // avoid it.
      nativeCurrency: { name: "USD Coin (native)", symbol: "USDC", decimals: 18 },
      isDefault: defaultNetwork === "arc",
      isTestnet: true,
      enabled: true,
      faucetUrl: readEnv("ARC_FAUCET_URL", "https://faucet.circle.com"),
      usdcIsNative: false,
    },
    ethereum: {
      id: "ethereum",
      family: "evm",
      displayName: "Ethereum",
      chainId: 1,
      rpcUrl: readEnv("ETHEREUM_RPC_URL"),
      explorerUrl: "https://etherscan.io",
      usdcAddress: readEnv("ETHEREUM_USDC_ADDRESS"),
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isDefault: defaultNetwork === "ethereum",
      isTestnet: false,
      enabled: true,
      faucetUrl: null,
      usdcIsNative: false,
    },
    base: {
      id: "base",
      family: "evm",
      displayName: "Base",
      chainId: 8453,
      rpcUrl: readEnv("BASE_RPC_URL"),
      explorerUrl: "https://basescan.org",
      usdcAddress: readEnv("BASE_USDC_ADDRESS"),
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isDefault: defaultNetwork === "base",
      isTestnet: false,
      enabled: true,
      faucetUrl: null,
      usdcIsNative: false,
    },
    polygon: {
      id: "polygon",
      family: "evm",
      displayName: "Polygon",
      chainId: 137,
      rpcUrl: readEnv("POLYGON_RPC_URL"),
      explorerUrl: "https://polygonscan.com",
      usdcAddress: readEnv("POLYGON_USDC_ADDRESS"),
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      isDefault: defaultNetwork === "polygon",
      isTestnet: false,
      enabled: true,
      faucetUrl: null,
      usdcIsNative: false,
    },
    arbitrum: {
      id: "arbitrum",
      family: "evm",
      displayName: "Arbitrum One",
      chainId: 42161,
      rpcUrl: readEnv("ARBITRUM_RPC_URL"),
      explorerUrl: "https://arbiscan.io",
      usdcAddress: readEnv("ARBITRUM_USDC_ADDRESS"),
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isDefault: defaultNetwork === "arbitrum",
      isTestnet: false,
      enabled: true,
      faucetUrl: null,
      usdcIsNative: false,
    },
    optimism: {
      id: "optimism",
      family: "evm",
      displayName: "Optimism",
      chainId: 10,
      rpcUrl: readEnv("OPTIMISM_RPC_URL"),
      explorerUrl: "https://optimistic.etherscan.io",
      usdcAddress: readEnv("OPTIMISM_USDC_ADDRESS"),
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isDefault: defaultNetwork === "optimism",
      isTestnet: false,
      enabled: true,
      faucetUrl: null,
      usdcIsNative: false,
    },
    giwa: {
      id: "giwa",
      family: "evm",
      displayName: "Giwa",
      chainId: 91342,
      rpcUrl: process.env.GIWA_RPC_URL ?? "https://sepolia-rpc.giwa.io",
      explorerUrl: "https://sepolia-explorer.giwa.io",
      usdcAddress: process.env.GIWA_USDC_ADDRESS ?? "",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      isDefault: defaultNetwork === "giwa",
      isTestnet: true,
      enabled: readBool("GIWA_ENABLED", true),
      faucetUrl: process.env.GIWA_FAUCET_URL ?? "https://faucet.giwa.io",
      usdcIsNative: false,
    },
  };

  return configs;
}
