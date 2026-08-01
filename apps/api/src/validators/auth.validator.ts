import { z } from "zod";

const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x-prefixed EVM address");

const networkIdSchema = z.enum([
  "arc",
  "ethereum",
  "base",
  "polygon",
  "arbitrum",
  "optimism",
  "giwa",
]);

export const requestNonceSchema = z.object({
  address: ethereumAddress,
  networkId: networkIdSchema.default("arc"),
});
export type RequestNonceInput = z.infer<typeof requestNonceSchema>;

export const verifySignatureSchema = z.object({
  address: ethereumAddress,
  nonce: z.string().min(16).max(128),
  signature: z.string().min(1),
  networkId: networkIdSchema.default("arc"),
});
export type VerifySignatureInput = z.infer<typeof verifySignatureSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
