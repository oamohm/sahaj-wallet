import { z } from "zod";

const networkIdSchema = z.enum([
  "arc",
  "ethereum",
  "base",
  "polygon",
  "arbitrum",
  "optimism",
  "giwa",
]);

export const claimRewardSchema = z.object({
  usdcAmount: z.string().regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal string"),
  networkId: networkIdSchema,
  destinationAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x-prefixed EVM address"),
});
export type ClaimRewardInput = z.infer<typeof claimRewardSchema>;

export const rewardHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type RewardHistoryQuery = z.infer<typeof rewardHistoryQuerySchema>;

export const grantManualRewardSchema = z.object({
  userId: z.string().min(1),
  usdcAmount: z.string().regex(/^\d+(\.\d+)?$/),
  xpAmount: z.number().int().min(0).default(0),
  networkId: networkIdSchema,
  reason: z.string().min(3).max(500),
});
export type GrantManualRewardInput = z.infer<typeof grantManualRewardSchema>;
