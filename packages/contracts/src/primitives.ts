import { z } from "zod";

/** Ticker symbol, always upper case, e.g. "AAPL" or "BRK.B". */
export const Ticker = z
  .string()
  .regex(/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/, "Invalid ticker symbol");
export type Ticker = z.infer<typeof Ticker>;

/** Unix epoch time in milliseconds. */
export const Timestamp = z.number().int().nonnegative();
export type Timestamp = z.infer<typeof Timestamp>;

/**
 * A price in US dollars, rounded to cents by the server.
 *
 * Plain numbers keep this read-only mock simple. A production system that moves
 * money would use integer minor units or decimal strings to avoid float drift.
 */
export const Price = z.number().positive();
export type Price = z.infer<typeof Price>;
