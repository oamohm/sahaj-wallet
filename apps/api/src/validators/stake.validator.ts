import { z } from "zod";
import { STAKE_TERMS } from "../constants/index.js";

const allowedLockDays = STAKE_TERMS.map((t) => t.lockDays) as [number, ...number[]];

export const createStakeSchema = z.object({
  networkId: z.enum(["arc", "ethereum", "base", "polygon", "arbitrum", "optimism", "giwa"]),
  sourceWalletId: z.string().min(1, "sourceWalletId is required"),
  principalUsdc: z.string().regex(/^\d+(\.\d+)?$/, "principalUsdc must be a positive decimal string"),
  lockDays: z.number().refine((d) => (allowedLockDays as number[]).includes(d), {
    message: `lockDays must be one of: ${allowedLockDays.join(", ")}`,
  }),
});
export type CreateStakeInput = z.infer<typeof createStakeSchema>;
