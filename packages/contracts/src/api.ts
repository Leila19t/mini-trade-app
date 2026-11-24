import type { z } from "zod";
import { HistoryResponse, type Range } from "./history";
import type { Ticker } from "./primitives";
import { StockDetail, StockListResponse } from "./stock";
import { Watchlist } from "./watchlist";

export const API_PREFIX = "/api";

export type HttpMethod = "GET" | "PUT" | "DELETE";

export interface Endpoint {
  method: HttpMethod;
  /** Route pattern for the server router, e.g. "/api/stocks/:symbol". */
  route: string;
  /** Builds the request path for the client. */
  path: (...args: never[]) => string;
  /** Schema the client parses the response with. */
  response: z.ZodType;
}

const seg = (value: string) => encodeURIComponent(value);

/**
 * Every HTTP endpoint in one place. The server registers `route` and the client
 * calls `path(...)` and parses with `response`, so both sides read from the
 * same definition.
 */
export const endpoints = {
  listStocks: {
    method: "GET",
    route: `${API_PREFIX}/stocks`,
    path: () => `${API_PREFIX}/stocks`,
    response: StockListResponse,
  },
  getStock: {
    method: "GET",
    route: `${API_PREFIX}/stocks/:symbol`,
    path: (symbol: Ticker) => `${API_PREFIX}/stocks/${seg(symbol)}`,
    response: StockDetail,
  },
  getHistory: {
    method: "GET",
    route: `${API_PREFIX}/stocks/:symbol/history`,
    path: (symbol: Ticker, range: Range) =>
      `${API_PREFIX}/stocks/${seg(symbol)}/history?range=${seg(range)}`,
    response: HistoryResponse,
  },
  getWatchlist: {
    method: "GET",
    route: `${API_PREFIX}/watchlist`,
    path: () => `${API_PREFIX}/watchlist`,
    response: Watchlist,
  },
  addToWatchlist: {
    method: "PUT",
    route: `${API_PREFIX}/watchlist/:symbol`,
    path: (symbol: Ticker) => `${API_PREFIX}/watchlist/${seg(symbol)}`,
    response: Watchlist,
  },
  removeFromWatchlist: {
    method: "DELETE",
    route: `${API_PREFIX}/watchlist/:symbol`,
    path: (symbol: Ticker) => `${API_PREFIX}/watchlist/${seg(symbol)}`,
    response: Watchlist,
  },
} as const satisfies Record<string, Endpoint>;

export type EndpointName = keyof typeof endpoints;
