import { z } from "zod";
import { Price, Ticker, Timestamp } from "./primitives";

/** Candle sizes for the Pro chart, in the order the interval tabs show them. */
export const CANDLE_INTERVALS = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;
export const CandleInterval = z.enum(CANDLE_INTERVALS);
export type CandleInterval = z.infer<typeof CandleInterval>;

export const DEFAULT_CANDLE_INTERVAL: CandleInterval = "15m";

const MINUTE_MS = 60_000;

/** Length of one candle in ms. Candles start on multiples of this since the Unix epoch (UTC). */
export const CANDLE_INTERVAL_MS: Record<CandleInterval, number> = {
  "1m": MINUTE_MS,
  "5m": 5 * MINUTE_MS,
  "15m": 15 * MINUTE_MS,
  "1H": 60 * MINUTE_MS,
  "4H": 240 * MINUTE_MS,
  "1D": 1440 * MINUTE_MS,
};

/**
 * How many candles the endpoint returns, the live one included. The Pro chart starts
 * on the latest few dozen; the rest is history to drag or zoom out to.
 */
export const CANDLE_COUNT = 300;

/** One candle: prices over `[timestamp, timestamp + interval)`. */
export const Candle = z.object({
  /** Start of the candle. */
  timestamp: Timestamp,
  open: Price,
  high: Price,
  low: Price,
  close: Price,
  /** Shares traded during the candle (so far, for the live one). */
  volume: z.number().int().nonnegative(),
});
export type Candle = z.infer<typeof Candle>;

/** Query string for the candles endpoint. A missing interval falls back to the default. */
export const CandlesQuery = z.object({
  interval: CandleInterval.default(DEFAULT_CANDLE_INTERVAL),
});
export type CandlesQuery = z.infer<typeof CandlesQuery>;

/**
 * The latest candles for one stock, oldest first. The last one is still open:
 * its close is the live price and it keeps changing until the interval ends.
 */
export const CandlesResponse = z.object({
  symbol: Ticker,
  interval: CandleInterval,
  candles: z.array(Candle).min(1),
});
export type CandlesResponse = z.infer<typeof CandlesResponse>;
