import type { IncomingMessage, ServerResponse } from "node:http";
import { API_PREFIX, CANDLE_INTERVALS, CandlesQuery, endpoints, HistoryQuery, Ticker, type EndpointName, type EndpointResponse } from "@mini-trade/contracts";
import { sleep, type Chaos } from "../chaos";
import type { PriceEngine } from "../engine";
import type { WatchlistStore } from "../watchlist-store";
import { HttpError, sendError, sendJson } from "./respond";
import { Router, type Params } from "./router";

/** The app has no sign-in, so every request belongs to this user. */
export const DEMO_USER_ID = "demo";

interface Context {
  params: Params;
  query: URLSearchParams;
  userId: string;
}

/**
 * A handler must return exactly what the endpoint's `response` schema
 * describes, so the server can't send a shape the client won't accept.
 */
type Handlers = { [K in EndpointName]: (ctx: Context) => EndpointResponse<K> };

interface Deps {
  engine: PriceEngine;
  watchlists: WatchlistStore;
  chaos: Chaos;
}

/** Validates a :symbol path parameter: 400 if it isn't a ticker, 404 if we don't list it. */
function knownSymbol(engine: PriceEngine, raw: string | undefined): Ticker {
  const parsed = Ticker.safeParse(raw);
  if (!parsed.success) throw new HttpError("BAD_REQUEST", `"${raw ?? ""}" is not a valid ticker symbol`);
  if (!engine.has(parsed.data)) throw new HttpError("NOT_FOUND", `Unknown symbol ${parsed.data}`);
  return parsed.data;
}

function createHandlers({ engine, watchlists }: Deps): Handlers {
  // The engine only returns undefined for unknown symbols, which knownSymbol has already rejected.
  const found = <T>(value: T | undefined, symbol: string): T => {
    if (value === undefined) throw new HttpError("NOT_FOUND", `Unknown symbol ${symbol}`);
    return value;
  };

  return {
    listStocks: () => ({ stocks: engine.listSummaries() }),

    getStock: ({ params }) => {
      const symbol = knownSymbol(engine, params.symbol);
      return found(engine.getDetail(symbol), symbol);
    },

    getHistory: ({ params, query }) => {
      const symbol = knownSymbol(engine, params.symbol);
      const parsed = HistoryQuery.safeParse(Object.fromEntries(query));
      if (!parsed.success) throw new HttpError("BAD_REQUEST", "range must be one of 1D, 1W, 1M, 3M, 1Y, 5Y");
      return found(engine.getHistory(symbol, parsed.data.range), symbol);
    },

    getCandles: ({ params, query }) => {
      const symbol = knownSymbol(engine, params.symbol);
      const parsed = CandlesQuery.safeParse(Object.fromEntries(query));
      if (!parsed.success) throw new HttpError("BAD_REQUEST", `interval must be one of ${CANDLE_INTERVALS.join(", ")}`);
      return found(engine.getCandles(symbol, parsed.data.interval), symbol);
    },

    getWatchlist: ({ userId }) => ({ symbols: watchlists.get(userId) }),

    addToWatchlist: ({ params, userId }) => ({
      symbols: watchlists.add(userId, knownSymbol(engine, params.symbol)),
    }),

    removeFromWatchlist: ({ params, userId }) => {
      // Removing only needs a well-formed ticker: deleting something that isn't there is a no-op.
      const parsed = Ticker.safeParse(params.symbol);
      if (!parsed.success) throw new HttpError("BAD_REQUEST", `"${params.symbol ?? ""}" is not a valid ticker symbol`);
      return { symbols: watchlists.remove(userId, parsed.data) };
    },
  };
}

type Handler = (ctx: Context) => unknown;

/** Builds the request listener for every `/api` route in `endpoints`. */
export function createApiHandler(deps: Deps) {
  const handlers = createHandlers(deps);
  const router = new Router<Handler>();
  for (const name of Object.keys(endpoints) as EndpointName[]) {
    const { method, route } = endpoints[name];
    router.add(method, route, handlers[name]);
  }

  /** Returns false when the request isn't for the API, so the caller can handle it. */
  return async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== API_PREFIX && !url.pathname.startsWith(`${API_PREFIX}/`)) return false;

    try {
      await sleep(deps.chaos.latency());
      const match = router.match(req.method ?? "GET", url.pathname);

      if (match.kind === "not-found") throw new HttpError("NOT_FOUND", `No route for ${url.pathname}`);
      if (match.kind === "method-not-allowed") {
        sendError(res, new HttpError("BAD_REQUEST", `Method ${req.method ?? ""} not allowed`, 405), {
          allow: match.allowed.join(", "),
        });
        return true;
      }
      // Fail before running the handler, so a failed watchlist change really didn't happen.
      if (deps.chaos.shouldFail()) throw new HttpError("UNAVAILABLE", "Simulated outage, please retry");

      const body = match.handler({ params: match.params, query: url.searchParams, userId: DEMO_USER_ID });
      sendJson(res, 200, body);
    } catch (error) {
      if (error instanceof HttpError) {
        sendError(res, error);
      } else {
        console.error("Unhandled error in", req.method, url.pathname, error);
        sendError(res, new HttpError("INTERNAL", "Something went wrong"));
      }
    }
    return true;
  };
}
