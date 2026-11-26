import {
  ApiError,
  CANDLE_COUNT,
  CandlesResponse,
  endpoints,
  HistoryResponse,
  RANGES,
  StockDetail,
  StockListResponse,
  Watchlist,
} from "@mini-trade/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UNIVERSE } from "./engine";
import { DEMO_USER_ID } from "./http/api";
import { startTestServer, type TestServer } from "./testing";

let t: TestServer;

beforeEach(async () => {
  // These are REST tests: freeze the market (no ticks during a test) so two
  // requests in a row see the same live price. A 20 ms tick races them on slow CI.
  t = await startTestServer({ initialWatchlist: ["AAPL", "NVDA"], flushIntervalMs: 60_000 });
});
afterEach(() => t.close());

const request = (path: string, init?: RequestInit) => fetch(`${t.baseUrl}${path}`, init);

async function expectError(res: Response, status: number, code: ApiError["error"]["code"]) {
  const text = await res.text();
  expect(res.status, `${res.url} answered ${text}`).toBe(status);
  const body = ApiError.parse(JSON.parse(text));
  expect(body.error.code).toBe(code);
  return body;
}

describe("GET /api/stocks", () => {
  it("lists every stock with a price snapshot and trend", async () => {
    const res = await request(endpoints.listStocks.path());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = StockListResponse.parse(await res.json());
    expect(body.stocks.map((s) => s.symbol)).toEqual(UNIVERSE.map((s) => s.symbol));
  });
});

describe("GET /api/stocks/:symbol", () => {
  it("returns the stock detail", async () => {
    const res = await request(endpoints.getStock.path("AAPL"));
    const body = StockDetail.parse(await res.json());
    expect(body.symbol).toBe("AAPL");
    expect(body.stats.low24h).toBeLessThanOrEqual(body.stats.high24h);
  });

  it("matches the price in the list", async () => {
    const list = StockListResponse.parse(await (await request(endpoints.listStocks.path())).json());
    const detail = StockDetail.parse(await (await request(endpoints.getStock.path("MSFT"))).json());
    expect(detail.price).toBe(list.stocks.find((s) => s.symbol === "MSFT")?.price);
  });

  it("404s for a symbol we don't list", async () => {
    await expectError(await request(endpoints.getStock.path("ZZZZ")), 404, "NOT_FOUND");
  });

  it("400s for something that isn't a ticker", async () => {
    await expectError(await request("/api/stocks/aapl"), 400, "BAD_REQUEST");
    await expectError(await request("/api/stocks/%E0"), 400, "BAD_REQUEST");
  });
});

describe("GET /api/stocks/:symbol/history", () => {
  it.each(RANGES)("returns %s history ending at the live price", async (range) => {
    const res = await request(endpoints.getHistory.path("NVDA", range));
    const body = HistoryResponse.parse(await res.json());
    expect(body.range).toBe(range);
    const detail = StockDetail.parse(await (await request(endpoints.getStock.path("NVDA"))).json());
    expect(body.points.at(-1)?.price).toBe(detail.price);
  });

  it("defaults to 1D when range is missing", async () => {
    const body = HistoryResponse.parse(await (await request("/api/stocks/AAPL/history")).json());
    expect(body.range).toBe("1D");
  });

  it("400s for an unknown range", async () => {
    await expectError(await request("/api/stocks/AAPL/history?range=2D"), 400, "BAD_REQUEST");
  });

  it("404s for an unknown symbol", async () => {
    await expectError(await request(endpoints.getHistory.path("ZZZZ", "1D")), 404, "NOT_FOUND");
  });
});

describe("GET /api/stocks/:symbol/candles", () => {
  it("returns candles for the interval", async () => {
    const res = await request(endpoints.getCandles.path("AAPL", "5m"));
    const body = CandlesResponse.parse(await res.json());
    expect(body).toMatchObject({ symbol: "AAPL", interval: "5m" });
    expect(body.candles).toHaveLength(CANDLE_COUNT);
  });

  it("defaults to 15m when interval is missing", async () => {
    const body = CandlesResponse.parse(await (await request("/api/stocks/AAPL/candles")).json());
    expect(body.interval).toBe("15m");
  });

  it("400s for an unknown interval", async () => {
    await expectError(await request("/api/stocks/AAPL/candles?interval=2m"), 400, "BAD_REQUEST");
  });

  it("404s for an unknown symbol", async () => {
    await expectError(await request(endpoints.getCandles.path("ZZZZ", "1H")), 404, "NOT_FOUND");
  });
});

describe("watchlist", () => {
  const get = async () => Watchlist.parse(await (await request(endpoints.getWatchlist.path())).json());
  const put = (symbol: string) => request(endpoints.addToWatchlist.path(symbol), { method: "PUT" });
  const del = (symbol: string) => request(endpoints.removeFromWatchlist.path(symbol), { method: "DELETE" });

  it("starts with the initial watchlist", async () => {
    expect((await get()).symbols).toEqual(["AAPL", "NVDA"]);
  });

  it("adds to the front and returns the new list", async () => {
    const res = await put("MSFT");
    expect(Watchlist.parse(await res.json()).symbols).toEqual(["MSFT", "AAPL", "NVDA"]);
    expect((await get()).symbols).toEqual(["MSFT", "AAPL", "NVDA"]);
  });

  it("is idempotent", async () => {
    await put("AAPL");
    expect((await get()).symbols).toEqual(["AAPL", "NVDA"]);
    await del("TSLA");
    await del("NVDA");
    await del("NVDA");
    expect((await get()).symbols).toEqual(["AAPL"]);
  });

  it("rejects adding a symbol we don't list", async () => {
    await expectError(await put("ZZZZ"), 404, "NOT_FOUND");
    expect((await get()).symbols).toEqual(["AAPL", "NVDA"]);
  });
});

describe("routing", () => {
  it("404s for unknown API paths and non-API paths", async () => {
    await expectError(await request("/api/nope"), 404, "NOT_FOUND");
    await expectError(await request("/"), 404, "NOT_FOUND");
  });

  it("405s for the wrong method, with an Allow header", async () => {
    const res = await request("/api/watchlist/AAPL", { method: "POST" });
    await expectError(res, 405, "BAD_REQUEST");
    expect(res.headers.get("allow")).toBe("PUT, DELETE");
  });
});

const alwaysFail = {
  latencyMs: { min: 0, max: 0 },
  errorRate: 1,
  socketDropAfterMs: { min: 1e9, max: 1e9 },
  silentDropShare: 0,
};

describe("simulated failures", () => {
  it("fails requests with 503 UNAVAILABLE at the configured rate", async () => {
    await t.close();
    t = await startTestServer({
      initialWatchlist: ["AAPL"],
      chaos: alwaysFail,
    });
    await expectError(await request(endpoints.listStocks.path()), 503, "UNAVAILABLE");
  });

  it("does not apply a watchlist change when the request fails", async () => {
    await t.close();
    t = await startTestServer({
      initialWatchlist: ["AAPL"],
      chaos: alwaysFail,
    });
    await expectError(await request(endpoints.addToWatchlist.path("MSFT"), { method: "PUT" }), 503, "UNAVAILABLE");
    expect(t.server.watchlists.get(DEMO_USER_ID)).toEqual(["AAPL"]);
  });

  it("adds latency", async () => {
    await t.close();
    t = await startTestServer({
      chaos: { ...alwaysFail, errorRate: 0, latencyMs: { min: 120, max: 120 } },
    });
    const started = performance.now();
    await request(endpoints.getWatchlist.path());
    expect(performance.now() - started).toBeGreaterThanOrEqual(110);
  });
});
