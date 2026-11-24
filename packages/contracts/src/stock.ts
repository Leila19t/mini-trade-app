import { z } from "zod";
import { Price, Ticker, Timestamp } from "./primitives";

export const Exchange = z.enum(["NASDAQ", "NYSE"]);
export type Exchange = z.infer<typeof Exchange>;

/** Facts about a stock that don't change during a session. */
export const Stock = z.object({
  symbol: Ticker,
  name: z.string().min(1),
  exchange: Exchange,
  currency: z.literal("USD"),
});
export type Stock = z.infer<typeof Stock>;

/**
 * One row of the stock list: the stock plus a price snapshot.
 *
 * The mock market trades 24/7, so "today" is a rolling 24-hour window (like
 * crypto apps) rather than an exchange session. Live prices then arrive over
 * the socket; the 24h change is derived on the client from `price` and
 * `price24hAgo`, so it is never sent twice.
 */
export const StockSummary = Stock.extend({
  price: Price,
  /** Price exactly 24 hours ago: the reference for the change shown in the list. */
  price24hAgo: Price,
  /** Hourly prices over the last 24 hours, oldest first. Drives the list sparkline. */
  trend: z.array(Price).min(2),
  updatedAt: Timestamp,
});
export type StockSummary = z.infer<typeof StockSummary>;

export const StockListResponse = z.object({
  stocks: z.array(StockSummary),
});
export type StockListResponse = z.infer<typeof StockListResponse>;

export const StockStats = z.object({
  price24hAgo: Price,
  high24h: Price,
  low24h: Price,
  week52High: Price,
  week52Low: Price,
  /** Shares traded over the last 24 hours. */
  volume24h: z.number().int().nonnegative(),
  marketCap: z.number().nonnegative(),
});
export type StockStats = z.infer<typeof StockStats>;

/** Everything the detail page needs except the chart history. */
export const StockDetail = Stock.extend({
  price: Price,
  updatedAt: Timestamp,
  stats: StockStats,
});
export type StockDetail = z.infer<typeof StockDetail>;
