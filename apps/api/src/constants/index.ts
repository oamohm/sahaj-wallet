export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const AUTH_NONCE_TTL_SECONDS = 5 * 60; // 5 minutes

export const RATE_LIMIT_MAX = 100;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const AUTH_NONCE_MESSAGE_PREFIX = "Sign this message to authenticate with Sahaj Wallet.\n\nNonce:";

export const FAUCET_COOLDOWN_HOURS = 24;
export const FAUCET_REQUEST_TIMEOUT_MS = 8_000;

// Fixed-term USDC staking (DeFi track): a small set of allowed lock terms,
// each with its own fixed APY, configured centrally so the UI and backend
// can never drift out of sync on what's actually offered.
export const STAKE_TERMS: ReadonlyArray<{ lockDays: number; apyBps: number }> = [
  { lockDays: 7, apyBps: 300 }, // 3.00% APY
  { lockDays: 30, apyBps: 450 }, // 4.50% APY
  { lockDays: 90, apyBps: 600 }, // 6.00% APY
];
export const DAYS_PER_YEAR = 365;
