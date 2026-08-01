import type { PrismaClient, NetworkId } from "@sahaj/database";
import type { AdapterRegistry } from "@sahaj/blockchain-adapters";
import { FAUCET_COOLDOWN_HOURS, FAUCET_REQUEST_TIMEOUT_MS } from "../../constants/index.js";
import { TooManyRequestsError, ValidationError } from "../../errors/app-error.js";

export interface FaucetResult {
  mode: "dispensed" | "manual";
  message: string;
  faucetUrl: string | null;
}

/** Env var name holding a JSON faucet API endpoint for a given testnet, if the operator has configured one. */
function faucetApiUrlEnvVar(networkId: "arc" | "giwa"): string {
  return networkId === "arc" ? "ARC_FAUCET_API_URL" : "GIWA_FAUCET_API_URL";
}

/**
 * Proxies faucet requests to official testnet faucets. Two operating
 * modes, chosen automatically per network:
 *   - "dispensed": operator has configured a real JSON faucet API endpoint
 *     (ARC_FAUCET_API_URL / GIWA_FAUCET_API_URL) — we POST the address to
 *     it server-side and report the real result.
 *   - "manual": no API endpoint configured (most public faucets require a
 *     captcha and have no stable public API), so we hand back the official
 *     faucet page URL rather than fabricating a fake success.
 * Either way, a cooldown is enforced via FaucetClaim so the platform can
 * never be used to hammer the upstream faucet.
 */
export class FaucetService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly adapters: AdapterRegistry,
  ) {}

  async requestFaucet(userId: string, networkId: "arc" | "giwa", address: string): Promise<FaucetResult> {
    if (!this.adapters.has(networkId)) {
      throw new ValidationError(`${networkId} is not currently enabled`);
    }

    const networkConfig = this.adapters.get(networkId).config;
    if (!networkConfig.isTestnet) {
      throw new ValidationError("Faucet is only available for testnets");
    }

    await this.enforceCooldown(userId, address, networkId);

    const apiUrl = process.env[faucetApiUrlEnvVar(networkId)];
    if (!apiUrl) {
      await this.recordClaim(userId, address, networkId, "redirected", "No faucet API configured; manual claim");
      return {
        mode: "manual",
        message: `Visit the official ${networkConfig.displayName} faucet to claim test tokens.`,
        faucetUrl: networkConfig.faucetUrl,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FAUCET_REQUEST_TIMEOUT_MS);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        await this.recordClaim(userId, address, networkId, "failed", `Faucet API returned ${response.status}: ${body.slice(0, 300)}`);
        return {
          mode: "manual",
          message: "The faucet API is temporarily unavailable. Please try the official faucet directly.",
          faucetUrl: networkConfig.faucetUrl,
        };
      }

      await this.recordClaim(userId, address, networkId, "succeeded", "Faucet API accepted the request");
      return {
        mode: "dispensed",
        message: `Test tokens requested from the ${networkConfig.displayName} faucet. They should arrive shortly — check your balance.`,
        faucetUrl: networkConfig.faucetUrl,
      };
    } catch (error) {
      await this.recordClaim(
        userId,
        address,
        networkId,
        "failed",
        error instanceof Error ? error.message : "Unknown faucet error",
      );
      return {
        mode: "manual",
        message: "Could not reach the faucet automatically. Please use the official faucet link instead.",
        faucetUrl: networkConfig.faucetUrl,
      };
    }
  }

  private async enforceCooldown(userId: string, address: string, networkId: NetworkId): Promise<void> {
    const since = new Date(Date.now() - FAUCET_COOLDOWN_HOURS * 60 * 60 * 1000);
    const recentClaim = await this.prisma.faucetClaim.findFirst({
      where: {
        networkId,
        status: "succeeded",
        OR: [{ userId }, { address: address.toLowerCase() }],
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentClaim) {
      const hoursRemaining = Math.ceil(
        (recentClaim.createdAt.getTime() + FAUCET_COOLDOWN_HOURS * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000),
      );
      throw new TooManyRequestsError(
        `You already claimed from this faucet recently. Try again in about ${Math.max(1, hoursRemaining)}h.`,
      );
    }
  }

  private async recordClaim(
    userId: string,
    address: string,
    networkId: NetworkId,
    status: "succeeded" | "failed" | "redirected",
    message: string,
  ) {
    await this.prisma.faucetClaim.create({
      data: { userId, address: address.toLowerCase(), networkId, status, message },
    });
  }
}
