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

export const balanceQuerySchema = z.object({
  networkId: networkIdSchema,
  address: ethereumAddress,
});
export type BalanceQueryInput = z.infer<typeof balanceQuerySchema>;

export const linkWalletSchema = z.object({
  networkId: networkIdSchema,
  address: ethereumAddress,
  provider: z.enum(["metamask", "walletconnect", "coinbase", "circle"]),
  isPrimary: z.boolean().default(false),
});
export type LinkWalletInput = z.infer<typeof linkWalletSchema>;

export const createCircleWalletSchema = z.object({
  networkId: networkIdSchema,
});
export type CreateCircleWalletInput = z.infer<typeof createCircleWalletSchema>;

export const recordExternalTxSchema = z.object({
  networkId: networkIdSchema,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid transaction hash"),
});
export type RecordExternalTxInput = z.infer<typeof recordExternalTxSchema>;

export const circleSendSchema = z.object({
  circleWalletId: z.string().min(1),
  destinationAddress: ethereumAddress,
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal string"),
  networkId: networkIdSchema,
});
export type CircleSendInput = z.infer<typeof circleSendSchema>;
