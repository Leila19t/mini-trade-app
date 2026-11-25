import { z } from "zod";
import { endpoints, type EndpointName } from "./api";
import { ApiError, ApiErrorCode } from "./errors";
import { HistoryPoint, HistoryResponse, Range } from "./history";
import { Price, Ticker, Timestamp } from "./primitives";
import { ClientMessage, PriceTick, ServerMessage, WS_PATH } from "./socket";
import { Exchange, StockDetail, StockListResponse, StockStats, StockSummary } from "./stock";
import { Watchlist } from "./watchlist";

/**
 * Builds the OpenAPI 3.1 document from the same schemas and `endpoints` the
 * apps use, so the docs can't drift from the code. Run
 * `pnpm --filter @mini-trade/server openapi` to regenerate `docs/openapi.json`.
 */

type Meta = { id: string; description?: string };

/** Named schemas become `components.schemas`; anything nested that's registered here is a `$ref`. */
const components = z.registry<Meta>();
const register = (schema: z.ZodType, meta: Meta) => components.add(schema, meta);

register(Ticker, { id: "Ticker", description: 'Ticker symbol, always upper case, e.g. "AAPL" or "BRK.B".' });
register(Price, { id: "Price", description: "Price in US dollars, rounded to cents." });
register(Timestamp, { id: "Timestamp", description: "Unix epoch time in milliseconds." });
register(Exchange, { id: "Exchange" });
register(Range, { id: "Range", description: "Chart period. The mock market trades 24/7, so 1D is the last 24 hours." });
register(StockSummary, {
  id: "StockSummary",
  description: "One row of the stock list. The 24h change is derived on the client from `price` and `price24hAgo`; `trend` is hourly prices over the last 24 hours, oldest first.",
});
register(StockListResponse, { id: "StockListResponse" });
register(StockStats, { id: "StockStats", description: "All 24h figures are a rolling 24-hour window." });
register(StockDetail, { id: "StockDetail", description: "Everything the detail page needs except the chart history." });
register(HistoryPoint, { id: "HistoryPoint" });
register(HistoryResponse, { id: "HistoryResponse", description: "Price history for one stock and range, oldest point first. The last point is the live price." });
register(Watchlist, { id: "Watchlist", description: "The user's starred stocks, most recently added first." });
register(ApiErrorCode, { id: "ApiErrorCode" });
register(ApiError, { id: "ApiError", description: "Body of every non-2xx response." });
register(PriceTick, { id: "PriceTick" });
register(ClientMessage, { id: "ClientMessage", description: `WebSocket (${WS_PATH}): messages the client sends.` });
register(ServerMessage, { id: "ServerMessage", description: `WebSocket (${WS_PATH}): messages the server sends.` });

type ErrorStatus = 400 | 404 | 500 | 503;

interface EndpointDoc {
  summary: string;
  description?: string;
  tag: "Stocks" | "Watchlist";
  /** Error statuses besides 500 and 503, which every endpoint can return. */
  errors: ErrorStatus[];
}

/** One entry per endpoint, enforced by the type: adding an endpoint without docs fails typecheck. */
const docs: Record<EndpointName, EndpointDoc> = {
  listStocks: { summary: "List stocks", description: "Every stock with a price snapshot and a 24h trend for the sparkline. Live prices then arrive over the WebSocket.", tag: "Stocks", errors: [] },
  getStock: { summary: "Get stock detail", tag: "Stocks", errors: [400, 404] },
  getHistory: { summary: "Get price history", description: "Chart points for one range. Every range agrees with the others at shared timestamps.", tag: "Stocks", errors: [400, 404] },
  getWatchlist: { summary: "Get the watchlist", tag: "Watchlist", errors: [] },
  addToWatchlist: { summary: "Add a stock to the watchlist", description: "Idempotent: adding a stock that is already there changes nothing. Returns the whole list.", tag: "Watchlist", errors: [400, 404] },
  removeFromWatchlist: { summary: "Remove a stock from the watchlist", description: "Idempotent: removing a stock that isn't there changes nothing. Returns the whole list.", tag: "Watchlist", errors: [400] },
};

const ERROR_DESCRIPTIONS: Record<ErrorStatus, string> = {
  400: "BAD_REQUEST: invalid ticker or query parameter.",
  404: "NOT_FOUND: no stock with this symbol.",
  500: "INTERNAL: unexpected server error.",
  503: "UNAVAILABLE: simulated outage (about 2% of requests by default). Safe to retry.",
};

const ref = (schema: z.ZodType) => {
  const id = components.get(schema)?.id;
  if (!id) throw new Error("Schema used in an endpoint is not registered in openapi.ts");
  return { $ref: `#/components/schemas/${id}` };
};

const json = (schema: z.ZodType) => ({ "application/json": { schema: ref(schema) } });

const symbolParam = {
  name: "symbol",
  in: "path",
  required: true,
  schema: ref(Ticker),
  example: "AAPL",
};

const rangeParam = {
  name: "range",
  in: "query",
  required: false,
  schema: { ...ref(Range), default: "1D" },
};

const DESCRIPTION = `Mock backend for the Mini Trade take-home. It behaves like a real one: responses take 80–450 ms, about 2% of requests fail with 503, and WebSocket connections drop now and then. Start it with \`CHAOS=off\` to turn that off.

**Live prices** use a WebSocket at \`${WS_PATH}\` on the same host, which OpenAPI can't describe. The server sends \`welcome\` on connect; the client sends \`subscribe\` / \`unsubscribe\`; the server replies \`subscribed\`, sends a \`prices\` snapshot of new symbols, then batched \`prices\` updates and a \`heartbeat\` every few seconds. Message schemas: \`ClientMessage\` and \`ServerMessage\` below.`;

export function buildOpenApiDocument() {
  const { schemas } = z.toJSONSchema(components, { uri: (id) => `#/components/schemas/${id}` });
  // Each schema comes back as a standalone JSON Schema document; components don't need the $schema / $id headers.
  const cleaned = Object.fromEntries(
    Object.entries(schemas).map(([id, { $schema: _schema, $id: _id, ...schema }]) => [id, schema]),
  );

  const paths: Record<string, Record<string, unknown>> = {};
  for (const name of Object.keys(endpoints) as EndpointName[]) {
    const endpoint = endpoints[name];
    const doc = docs[name];
    const path = endpoint.route.replace(/:(\w+)/g, "{$1}");
    const parameters = [
      ...(endpoint.route.includes(":symbol") ? [symbolParam] : []),
      ...(name === "getHistory" ? [rangeParam] : []),
    ];

    const responses: Record<string, unknown> = {
      200: { description: "OK", content: json(endpoint.response) },
    };
    for (const status of [...doc.errors, 500, 503] as const) {
      responses[status] = { description: ERROR_DESCRIPTIONS[status], content: json(ApiError) };
    }

    paths[path] = {
      ...paths[path],
      [endpoint.method.toLowerCase()]: {
        operationId: name,
        summary: doc.summary,
        ...(doc.description && { description: doc.description }),
        tags: [doc.tag],
        ...(parameters.length > 0 && { parameters }),
        responses,
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: { title: "Mini Trade mock API", version: "1.0.0", description: DESCRIPTION },
    servers: [{ url: "http://localhost:4000", description: "Local mock server (pnpm dev)" }],
    tags: [
      { name: "Stocks", description: "Stock list, detail and chart history. Public." },
      { name: "Watchlist", description: "The user's starred stocks. One demo user until sign-in exists." },
    ],
    paths,
    components: { schemas: cleaned },
  };
}
