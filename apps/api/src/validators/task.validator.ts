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

/**
 * verificationConfig shape depends on task type:
 *  - social: no config needed; always requires admin review of `proof`
 *  - wallet: { requiredNetworkId } — verified automatically if the user has
 *    linked a WalletAccount on that network
 *  - onchain: { requiredNetworkId, minConfirmations? } — verified by
 *    checking a submitted txHash's receipt via the blockchain adapter
 */
const socialConfig = z.object({ kind: z.literal("social") });
const walletConfig = z.object({ kind: z.literal("wallet"), requiredNetworkId: networkIdSchema });
const onchainConfig = z.object({
  kind: z.literal("onchain"),
  requiredNetworkId: networkIdSchema,
  minConfirmations: z.number().int().min(1).default(1),
});

export const verificationConfigSchema = z.discriminatedUnion("kind", [
  socialConfig,
  walletConfig,
  onchainConfig,
]);
export type VerificationConfig = z.infer<typeof verificationConfigSchema>;

export const createTaskSchema = z.object({
  campaignId: z.string().min(1),
  type: z.enum(["social", "wallet", "onchain"]),
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(2000),
  rewardUsdcAmount: z.string().regex(/^\d+(\.\d+)?$/),
  xpReward: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
  verificationConfig: verificationConfigSchema,
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const submitTaskCompletionSchema = z.object({
  taskId: z.string().min(1),
  /** For social tasks: a URL/handle proof. For onchain tasks: a tx hash. */
  proof: z.string().min(1).max(2000),
});
export type SubmitTaskCompletionInput = z.infer<typeof submitTaskCompletionSchema>;

export const reviewTaskCompletionSchema = z.object({
  taskCompletionId: z.string().min(1),
  approve: z.boolean(),
  rejectedReason: z.string().max(500).optional(),
});
export type ReviewTaskCompletionInput = z.infer<typeof reviewTaskCompletionSchema>;
