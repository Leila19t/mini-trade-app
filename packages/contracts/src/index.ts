import { z } from "zod";

export const PriceTick = z.object({
    type: z.literal("price"),
    symbol: z.string(),
    price: z.number().positive(),
    timestamp: z.number(),
});
export type PriceTick = z.infer<typeof PriceTick>;