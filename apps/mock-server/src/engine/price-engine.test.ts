import { HistoryResponse, PriceTick, RANGES, StockDetail, StockListResponse } from "@mini-trade/contracts";
import { describe, expect, it } from "vitest";
import { PriceEngine } from "./price-engine";
import { RANGE_CONFIG } from "./ranges";
import { DAY, HOUR, MINUTE, SECOND } from "./time";
import { UNIVERSE } from "./universe";

const START = Date.UTC(2026, 10, 25, 12, 0, 0);

/** An engine with a controllable clock. */
function setup(options: { seed?: number; tickProbability?: number } = {}) {
  let now = START;
  const engine = new PriceEngine({ now: () => now, ...options });
  const advance = (ms: number) => {
    now += ms;
  };
  /** Advance in steps, ticking after each one, like the server loop does. */
  const run = (total: number, step = SECOND) => {
    const ticks: PriceTick[] = [];
    for (let t = 0; t < total; t += step) {
      advance(step);
      ticks.push(...engine.tick());
    }
    return ticks;
  };
  return { engine, advance, run, now: () => now };
}

describe("PriceEngine", () => {
  it("is deterministic for a given seed", () => {
    const a = setup({ seed: 7 });
    const b = setup({ seed: 7 });
    expect(a.engine.getHistory("AAPL", "1Y")).toEqual(b.engine.getHistory("AAPL", "1Y"));
    expect(a.run(30 * SECOND)).toEqual(b.run(30 * SECOND));
  });

  it("produces different markets for different seeds", () => {
    const a = setup({ seed: 1 }).engine.getHistory("AAPL", "1Y");
    const b = setup({ seed: 2 }).engine.getHistory("AAPL", "1Y");
    expect(a).not.toEqual(b);
  });

  it("starts every stock at its configured price", () => {
    const { engine } = setup();
    for (const def of UNIVERSE) expect(engine.getSummary(def.symbol)?.price).toBe(def.price);
  });

  it("returns undefined for unknown symbols", () => {
    const { engine } = setup();
    expect(engine.getSummary("NOPE")).toBeUndefined();
    expect(engine.getDetail("NOPE")).toBeUndefined();
    expect(engine.getHistory("NOPE", "1D")).toBeUndefined();
  });

  describe("history", () => {
    it.each(RANGES)("%s ends exactly at the live price, in time order, inside its window", (range) => {
      const { engine, run, now } = setup();
      run(10 * MINUTE);
      const history = engine.getHistory("NVDA", range)!;
      const points = history.points;

      expect(points.at(-1)).toEqual({ timestamp: now(), price: engine.getSummary("NVDA")!.price });
      for (let i = 1; i < points.length; i++) expect(points[i]!.timestamp).toBeGreaterThan(points[i - 1]!.timestamp);
      expect(points[0]!.timestamp).toBeGreaterThanOrEqual(now() - RANGE_CONFIG[range].window);
    });

    it.each(RANGES)("%s has a sensible number of points", (range) => {
      const { engine } = setup();
      const { window, interval } = RANGE_CONFIG[range];
      const expected = window / interval;
      const count = engine.getHistory("AAPL", range)!.points.length;
      expect(count).toBeGreaterThanOrEqual(Math.floor(expected));
      expect(count).toBeLessThanOrEqual(Math.ceil(expected) + 2);
    });

    it("agrees across resolutions at shared timestamps (1Y vs 1M vs 1W vs 1D)", () => {
      const { engine } = setup();
      const pairs = [
        ["1Y", "1M"],
        ["1M", "1W"],
        ["1W", "1D"],
      ] as const;
      for (const [coarse, fine] of pairs) {
        const fineByTime = new Map(engine.getHistory("TSLA", fine)!.points.map((p) => [p.timestamp, p.price]));
        const shared = engine.getHistory("TSLA", coarse)!.points.filter((p) => fineByTime.has(p.timestamp));
        expect(shared.length).toBeGreaterThan(1);
        for (const p of shared) expect(fineByTime.get(p.timestamp)).toBe(p.price);
      }
    });

    it("includes live prices once time has passed", () => {
      const { engine, run } = setup({ tickProbability: 1 });
      const ticks = run(30 * MINUTE);
      const lastTick = ticks.filter((t) => t.symbol === "AAPL").at(-1)!;
      const day = engine.getHistory("AAPL", "1D")!.points;
      expect(day.at(-1)!.price).toBe(lastTick.price);
      // 30 minutes of live data adds ~6 five-minute points after the generated history.
      expect(day.filter((p) => p.timestamp > START).length).toBeGreaterThanOrEqual(6);
    });

    it("keeps generated history moving realistically (no wild jumps between days)", () => {
      const { engine } = setup();
      const points = engine.getHistory("KO", "1Y")!.points;
      for (let i = 1; i < points.length; i++) {
        const move = Math.abs(points[i]!.price / points[i - 1]!.price - 1);
        expect(move).toBeLessThan(0.1); // KO is a calm stock: no 10% days
      }
    });
  });

  describe("live ticks", () => {
    it("only emits ticks when time has moved", () => {
      const { engine } = setup({ tickProbability: 1 });
      expect(engine.tick()).toEqual([]);
    });

    it("updates the price the rest of the API reports", () => {
      const { engine, run } = setup({ tickProbability: 1 });
      const ticks = run(5 * SECOND);
      const last = ticks.filter((t) => t.symbol === "MSFT").at(-1)!;
      expect(engine.getSummary("MSFT")!.price).toBe(last.price);
      expect(engine.getDetail("MSFT")!.price).toBe(last.price);
      expect(engine.getSummary("MSFT")!.updatedAt).toBe(last.timestamp);
    });

    it("moves only some stocks per tick", () => {
      const { run } = setup({ tickProbability: 0.5 });
      const ticks = run(SECOND);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeLessThan(UNIVERSE.length);
    });

    it("moves visibly but plausibly over a minute", () => {
      const { engine, run } = setup({ tickProbability: 1 });
      run(MINUTE);
      for (const def of UNIVERSE) {
        const move = Math.abs(engine.getSummary(def.symbol)!.price / def.price - 1);
        expect(move).toBeLessThan(0.05);
      }
    });
  });

  describe("snapshot data", () => {
    it("derives 24h stats from the same price path", () => {
      const { engine, run } = setup();
      run(2 * MINUTE);
      const detail = engine.getDetail("AAPL")!;
      const day = engine.getHistory("AAPL", "1D")!.points.map((p) => p.price);
      expect(detail.stats.high24h).toBe(Math.max(...day));
      expect(detail.stats.low24h).toBe(Math.min(...day));
      expect(detail.stats.high24h).toBeGreaterThanOrEqual(detail.price);
      expect(detail.stats.low24h).toBeLessThanOrEqual(detail.price);
      expect(detail.stats.week52High).toBeGreaterThanOrEqual(detail.stats.high24h);
      expect(detail.stats.week52Low).toBeLessThanOrEqual(detail.stats.low24h);
    });

    it("reports the price from 24 hours ago", () => {
      const { engine } = setup();
      const day = engine.getHistory("GOOGL", "1D")!.points;
      expect(engine.getSummary("GOOGL")!.price24hAgo).toBe(day[0]!.price);
    });

    it("gives every stock an hourly 24h trend ending at the current price", () => {
      const { engine } = setup();
      for (const s of engine.listSummaries()) {
        expect(s.trend.length).toBeGreaterThanOrEqual(24);
        expect(s.trend.at(-1)).toBe(s.price);
      }
    });
  });

  describe("matches the shared contracts", () => {
    it("stock list, detail and every history range parse", () => {
      const { engine, run } = setup();
      run(MINUTE);
      expect(() => StockListResponse.parse({ stocks: engine.listSummaries() })).not.toThrow();
      for (const symbol of engine.symbols()) {
        expect(() => StockDetail.parse(engine.getDetail(symbol))).not.toThrow();
        for (const range of RANGES) expect(() => HistoryResponse.parse(engine.getHistory(symbol, range))).not.toThrow();
      }
    });

    it("ticks parse", () => {
      const { run } = setup();
      for (const tick of run(10 * SECOND)) expect(() => PriceTick.parse(tick)).not.toThrow();
    });
  });

  it("keeps working after running for more than a day", () => {
    const { engine, run } = setup({ tickProbability: 1 });
    run(DAY + HOUR, 30 * SECOND);
    const day = engine.getHistory("AAPL", "1D")!.points;
    expect(day.every((p) => p.timestamp > START)).toBe(true); // the whole 1D chart is now live data
    expect(() => StockDetail.parse(engine.getDetail("AAPL"))).not.toThrow();
  });
});

