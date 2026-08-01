import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { ACCESS_TOKEN_TTL_SECONDS } from "../constants/index.js";

export interface AccessTokenPayload {
  sub: string; // userId
  address: string;
  role: "user" | "admin";
}

export function signAccessToken(payload: AccessTokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload;
}

/** Refresh tokens are opaque random strings; only their hash is persisted. */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString("hex");
  return { token, tokenHash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}
