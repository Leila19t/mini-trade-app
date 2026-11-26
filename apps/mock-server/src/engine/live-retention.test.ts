import { CANDLE_INTERVAL_MS, CANDLE_INTERVALS, RANGES } from "@mini-trade/contracts";
import { describe, expect, it } from "vitest";
import { PriceEngine } from "./price-engine";
import { DAY, HOUR, MINUTE, WEEK } from "./time";
import { UNIVERSE } from "./universe";

const START = Date.UTC(2026, 10, 25, 12, 0, 0);
const STOCKS = UNIVERSE.slice(0, 2); // two stocks keep 9 simulated days fast

/** An engine on a fake clock that ticks once a minute, like a server left running. */
function setup(liveRetentionMs?: number) {
  let now = START;
  const engine = new PriceEngine({ now: () => now, seed: 7, tickProbability: 1, universe: STOCKS, liveRetentionMs });
  const runFor = (ms: number) => {
    for (let t = 0; t < ms; t += MINUTE) {
      now += MINUTE;
      engine.tick();
    }
  };
  return { engine, runFor };
}

describe("live price retention", () => {
  it("keeps one sample per minute for the last week, and one per hour before that", () => {
    const { engine, runFor } = setup();
    runFor(9 * DAY);
    const counts = engine.retainedSamples("AAPL");
    expect(counts?.minute).toBeGreaterThanOrEqual(WEEK / MINUTE - 1);
    expect(counts?.minute).toBeLessThanOrEqual(WEEK / MINUTE + 1);
    expect(counts?.hourly).toBeGreaterThanOrEqual((2 * DAY) / HOUR - 1);
    expect(counts?.hourly).toBeLessThanOrEqual((2 * DAY) / HOUR + 1);
  });

  it("stays the same size however long it runs", () => {
    const { engine, runFor } = setup(DAY); // a one-day window, so the test is quick
    runFor(2 * DAY);
    const after2Days = engine.retainedSamples("AAPL")?.minute;
    runFor(2 * DAY);
    expect(engine.retainedSamples("AAPL")?.minute).toBe(after2Days);
  });

  it("changes no line chart or stat, and no candle from the last week", () => {
    const thinned = setup();
    const full = setup(Number.POSITIVE_INFINITY);
    thinned.runFor(9 * DAY);
    full.runFor(9 * DAY);
    expect(full.engine.retainedSamples("AAPL")?.hourly).toBe(0);

    for (const range of RANGES) {
      expect(thinned.engine.getHistory("AAPL", range), range).toEqual(full.engine.getHistory("AAPL", range));
    }
    expect(thinned.engine.getDetail("AAPL")).toEqual(full.engine.getDetail("AAPL"));

    // Candles older than a week are rebuilt from the hourly prices (like the
    // pre-start history), so only the last week has to match exactly.
    const weekAgo = START + 9 * DAY - WEEK;
    for (const interval of CANDLE_INTERVALS) {
      const recent = (engine: PriceEngine) =>
        engine.getCandles("AAPL", interval)?.candles.filter((c) => c.timestamp >= weekAgo + CANDLE_INTERVAL_MS[interval]);
      expect(recent(thinned.engine), interval).toEqual(recent(full.engine));
    }
  });

  it("keeps older candles well-formed after thinning, ending at the live price", () => {
    const { engine, runFor } = setup();
    runFor(9 * DAY);
    const price = engine.quote("AAPL")?.price;
    for (const interval of ["1H", "4H", "1D"] as const) {
      const candles = engine.getCandles("AAPL", interval)?.candles ?? [];
      candles.forEach((c, i) => {
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
        if (i > 0) expect(c.open).toBe(candles[i - 1]?.close);
      });
      expect(candles.at(-1)?.close).toBe(price);
    }
  });
});
