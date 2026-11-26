import { CANDLE_COUNT, CANDLE_INTERVALS, CANDLE_INTERVAL_MS, CandlesResponse } from "@mini-trade/contracts";
import { describe, expect, it } from "vitest";
import { PriceEngine } from "./price-engine";
import { MINUTE, SECOND } from "./time";

const START = Date.UTC(2026, 10, 25, 12, 7, 30);

function setup(seed = 42) {
  let now = START;
  const engine = new PriceEngine({ now: () => now, seed, tickProbability: 1 });
  const run = (total: number, step = SECOND) => {
    for (let t = 0; t < total; t += step) {
      now += step;
      engine.tick();
    }
  };
  return { engine, run, now: () => now };
}

describe("PriceEngine.getCandles", () => {
  it.each(CANDLE_INTERVALS)("returns %s candles that match the contract", (interval) => {
    const { engine } = setup();
    const body = CandlesResponse.parse(engine.getCandles("AAPL", interval));
    expect(body.interval).toBe(interval);
    expect(body.candles).toHaveLength(CANDLE_COUNT);
  });

  it.each(CANDLE_INTERVALS)("lines %s candles up on the clock, one after another", (interval) => {
    const { engine, now } = setup();
    const ms = CANDLE_INTERVAL_MS[interval];
    const candles = engine.getCandles("NVDA", interval)?.candles ?? [];
    candles.forEach((c, i) => {
      expect(c.timestamp % ms).toBe(0);
      if (i > 0) expect(c.timestamp - (candles[i - 1]?.timestamp ?? 0)).toBe(ms);
    });
    const live = candles.at(-1);
    expect(live?.timestamp).toBeLessThanOrEqual(now());
    expect((live?.timestamp ?? 0) + ms).toBeGreaterThan(now());
  });

  it.each(CANDLE_INTERVALS)("keeps %s high/low around open and close, and opens at the previous close", (interval) => {
    const { engine, run } = setup();
    run(3 * MINUTE);
    const candles = engine.getCandles("TSLA", interval)?.candles ?? [];
    candles.forEach((c, i) => {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      if (i > 0) expect(c.open).toBe(candles[i - 1]?.close);
    });
  });

  it("closes the live candle at the live price", () => {
    const { engine, run } = setup();
    run(90 * SECOND);
    const quote = engine.quote("MSFT");
    for (const interval of CANDLE_INTERVALS) {
      expect(engine.getCandles("MSFT", interval)?.candles.at(-1)?.close).toBe(quote?.price);
    }
  });

  it("is deterministic, and finished candles don't change as time passes", () => {
    const a = setup(7);
    const b = setup(7);
    expect(a.engine.getCandles("AAPL", "15m")).toEqual(b.engine.getCandles("AAPL", "15m"));

    const before = a.engine.getCandles("AAPL", "1H")?.candles ?? [];
    a.run(30 * SECOND);
    const after = a.engine.getCandles("AAPL", "1H")?.candles ?? [];
    // Same window (still inside the same hour): every finished candle is unchanged.
    expect(after.slice(0, -1)).toEqual(before.slice(0, -1));
  });

  it("gives the live candle only part of a full candle's volume", () => {
    const { engine } = setup();
    const candles = engine.getCandles("AAPL", "1D")?.candles ?? [];
    const live = candles.at(-1)?.volume ?? 0;
    const typical = candles.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (candles.length - 1);
    expect(live).toBeGreaterThan(0);
    expect(live).toBeLessThan(typical);
  });

  it("returns undefined for unknown symbols", () => {
    expect(setup().engine.getCandles("NOPE", "1m")).toBeUndefined();
  });
});
