import { z } from "zod";

/** Ticker symbol */
export const Ticker = z
  .string()
  .regex(/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/, "Invalid ticker symbol");
export type Ticker = z.infer<typeof Ticker>;

/** Unix epoch time in milliseconds. */
export const Timestamp = z.number().int().nonnegative();
export type Timestamp = z.infer<typeof Timestamp>;

/**. sA price in US dollars, rounded to cents by the server. */
export const Price = z.number().positive();
export type Price = z.infer<typeof Price>;
