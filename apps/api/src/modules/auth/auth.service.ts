import type { PrismaClient } from "@sahaj/database";
import type { NetworkId } from "@sahaj/shared-types";
import { AUTH_NONCE_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "../../constants/index.js";
import { ConflictError, UnauthorizedError } from "../../errors/app-error.js";
import {
  generateNonce,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken as verifyAccessTokenUtil,
} from "../../utils/jwt.js";
import { verifyWalletSignature } from "../../utils/signature.js";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    address: string;
    email: string | null;
    role: "user" | "admin";
  };
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwtSecret: string,
  ) {}

  /** Issues a fresh nonce a wallet must sign to prove address ownership. */
  async requestNonce(address: string, networkId: NetworkId): Promise<{ nonce: string; expiresAt: Date }> {
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + AUTH_NONCE_TTL_SECONDS * 1000);

    await this.prisma.authNonce.create({
      data: {
        address: address.toLowerCase(),
        nonce,
        networkId,
        expiresAt,
      },
    });

    return { nonce, expiresAt };
  }

  /**
   * Verifies a signed nonce, provisions the user + wallet on first login,
   * and issues a fresh access/refresh token pair.
   */
  async verifySignatureAndLogin(params: {
    address: string;
    nonce: string;
    signature: string;
    networkId: NetworkId;
  }): Promise<AuthSession> {
    const normalizedAddress = params.address.toLowerCase();

    const nonceRecord = await this.prisma.authNonce.findUnique({
      where: { nonce: params.nonce },
    });

    if (
      !nonceRecord ||
      nonceRecord.address !== normalizedAddress ||
      nonceRecord.consumedAt ||
      nonceRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedError("Nonce is invalid, expired, or already used");
    }

    const isValidSignature = verifyWalletSignature(params.address, params.nonce, params.signature);
    if (!isValidSignature) {
      throw new UnauthorizedError("Signature verification failed");
    }

    await this.prisma.authNonce.update({
      where: { id: nonceRecord.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.upsert({
      where: { primaryAddress: normalizedAddress },
      create: {
        primaryAddress: normalizedAddress,
        wallets: {
          create: {
            networkId: params.networkId,
            address: normalizedAddress,
            provider: "metamask",
            isPrimary: true,
          },
        },
      },
      update: {},
    });

    return this.issueSession(user.id, normalizedAddress, user.role);
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token is invalid or expired");
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(record.user.id, record.user.primaryAddress, record.user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User no longer exists");
    return user;
  }

  private async issueSession(
    userId: string,
    address: string,
    role: "user" | "admin",
  ): Promise<AuthSession> {
    const accessToken = signAccessToken({ sub: userId, address, role }, this.jwtSecret);
    const { token: refreshToken, tokenHash } = generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, address: user.primaryAddress, email: user.email, role: user.role },
    };
  }
}

// Re-exported so controllers can verify tokens without importing the raw
// jwt utility directly, keeping a single module boundary for auth concerns.
export function verifyAccessToken(token: string, secret: string) {
  return verifyAccessTokenUtil(token, secret);
}

export { ConflictError };
