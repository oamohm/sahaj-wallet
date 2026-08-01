import { verifyMessage } from "ethers";
import { AUTH_NONCE_MESSAGE_PREFIX } from "../constants/index.js";

export function buildNonceMessage(nonce: string): string {
  return `${AUTH_NONCE_MESSAGE_PREFIX} ${nonce}`;
}

/**
 * Verifies that `signature` was produced by `expectedAddress` signing the
 * message that embeds `nonce`. Throws nothing — returns a boolean so
 * callers decide how to surface the failure.
 */
export function verifyWalletSignature(
  expectedAddress: string,
  nonce: string,
  signature: string,
): boolean {
  try {
    const message = buildNonceMessage(nonce);
    const recovered = verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
