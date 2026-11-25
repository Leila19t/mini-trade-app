import type { Ticker } from "@mini-trade/contracts";

/**
 * App-wide constants (timings, limits, query keys...).
 * API paths, ranges and the WebSocket path come from @mini-trade/contracts; don't redeclare them here.
 */

/** Builds in-app URLs, so links never hand-write paths. */
export const paths = {
  markets: () => "/",
  stock: (symbol: Ticker) => `/stocks/${encodeURIComponent(symbol)}`,
};
