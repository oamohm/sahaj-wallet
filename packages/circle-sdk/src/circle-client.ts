import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import type { NetworkId } from "@sahaj/shared-types";

export type CircleEnvironment = "sandbox" | "production";

export interface CircleClientConfig {
  apiKey: string;
  entitySecret: string;
  environment: CircleEnvironment;
}

/**
 * Maps our internal NetworkId to the blockchain identifiers Circle's API
 * expects. Circle's sandbox environment only accepts testnet identifiers
 * and its production environment only accepts mainnet identifiers, so the
 * mapping must be environment-aware — see
 * https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-wallets
 * for the full enum. Circle DOES support Arc directly as "ARC-TESTNET";
 * Arc has no mainnet identifier yet since Arc mainnet hasn't launched.
 * Giwa has no Circle-managed-wallet mapping at all in either environment.
 */
const CIRCLE_BLOCKCHAIN_MAP: Record<CircleEnvironment, Partial<Record<NetworkId, string>>> = {
  sandbox: {
    arc: "ARC-TESTNET",
    ethereum: "ETH-SEPOLIA",
    base: "BASE-SEPOLIA",
    polygon: "MATIC-AMOY",
    arbitrum: "ARB-SEPOLIA",
    optimism: "OP-SEPOLIA",
  },
  production: {
    ethereum: "ETH",
    base: "BASE",
    polygon: "MATIC",
    arbitrum: "ARB",
    optimism: "OP",
  },
};

export function toCircleBlockchain(networkId: NetworkId, environment: CircleEnvironment): string {
  const mapped = CIRCLE_BLOCKCHAIN_MAP[environment][networkId];
  if (!mapped) {
    throw new Error(
      `Network "${networkId}" has no Circle-managed-wallet mapping in the "${environment}" environment; use the on-chain adapter instead.`,
    );
  }
  return mapped;
}

/**
 * Thin factory around Circle's SDK client so the rest of the platform only
 * ever imports from @sahaj/circle-sdk, never the raw Circle package. This is
 * the seam that lets us add Circle capabilities (bridge, swap, unified
 * balance) without touching business logic elsewhere.
 */
export function createCircleClient(config: CircleClientConfig) {
  return initiateDeveloperControlledWalletsClient({
    apiKey: config.apiKey,
    entitySecret: config.entitySecret,
  });
}

export function loadCircleConfigFromEnv(): CircleClientConfig {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const environment = (process.env.CIRCLE_ENVIRONMENT as CircleEnvironment) ?? "sandbox";

  if (!apiKey || !entitySecret) {
    throw new Error("CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set");
  }

  return { apiKey, entitySecret, environment };
}

export type CircleClient = ReturnType<typeof createCircleClient>;
