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

export const createCampaignSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  networkId: networkIdSchema.default("arc"),
  rewardUsdcAmount: z.string().regex(/^\d+(\.\d+)?$/),
  xpReward: z.number().int().min(0).default(0),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const listCampaignsQuerySchema = z.object({
  status: z.enum(["draft", "active", "ended", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;

export const campaignIdParamSchema = z.object({
  campaignId: z.string().min(1),
});
