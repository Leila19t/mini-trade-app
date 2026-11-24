import { z } from "zod";
import { Ticker } from "./primitives";

/** The user's starred stocks, most recently added first. */
export const Watchlist = z.object({
  symbols: z.array(Ticker),
});
export type Watchlist = z.infer<typeof Watchlist>;
