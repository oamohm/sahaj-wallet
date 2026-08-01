import { z } from "zod";

export const requestFaucetSchema = z.object({
  networkId: z.enum(["arc", "giwa"], {
    errorMap: () => ({ message: "Faucet is only available on testnets: arc or giwa" }),
  }),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x-prefixed EVM address"),
});
export type RequestFaucetInput = z.infer<typeof requestFaucetSchema>;
