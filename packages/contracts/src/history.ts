import { z } from "zod";
import { Price, Ticker, Timestamp } from "./primitives";

/** Chart periods, in the order the range tabs show them. */
export const RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y"] as const;
export const Range = z.enum(RANGES);
export type Range = z.infer<typeof Range>;

export const DEFAULT_RANGE: Range = "1D";

export const HistoryPoint = z.object({
  timestamp: Timestamp,
  price: Price,
});
export type HistoryPoint = z.infer<typeof HistoryPoint>;

/** Query string for the history endpoint. A missing range falls back to the default. */
export const HistoryQuery = z.object({
  range: Range.default(DEFAULT_RANGE),
});
export type HistoryQuery = z.infer<typeof HistoryQuery>;

/** Price history for one stock and range, oldest point first. */
export const HistoryResponse = z.object({
  symbol: Ticker,
  range: Range,
  points: z.array(HistoryPoint).min(2),
});
export type HistoryResponse = z.infer<typeof HistoryResponse>;
