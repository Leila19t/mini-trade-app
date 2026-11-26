import { describe, expect, it } from "vitest";
import { makeCandles, T0 } from "../test/candles";
import {
  candleChange,
  candleEnd,
  formatCandleTime,
  formatCountdown,
  toChartTime,
  withAlpha,
  withLivePrice,
} from "./candles";

const MIN = 60_000;
const tick = (price: number, timestamp: number) => ({ symbol: "NVDA", price, timestamp });

describe("withLivePrice", () => {
  const candles = makeCandles([101, 102, 103]); // last candle: 12:30–12:45, open 102, close 103
  const last = candles[2];

  it("returns the same candles without a tick, or with one older than the live candle", () => {
    expect(withLivePrice(candles, undefined, "15m")).toBe(candles);
    expect(withLivePrice(candles, tick(99, T0), "15m")).toBe(candles);
  });

  it("moves the live candle's close, and its high or low when the price breaks out", () => {
    const up = withLivePrice(candles, tick(110, T0 + 35 * MIN), "15m");
    expect(up).toHaveLength(3);
    expect(up[2]).toEqual({ ...last, close: 110, high: 110 });

    const down = withLivePrice(candles, tick(90, T0 + 35 * MIN), "15m");
    expect(down[2]).toEqual({ ...last, close: 90, low: 90 });
  });

  it("keeps the finished candles as they are (same objects), so the chart redraws only the last", () => {
    const next = withLivePrice(candles, tick(103.2, T0 + 40 * MIN), "15m");
    expect(next[0]).toBe(candles[0]);
    expect(next[1]).toBe(candles[1]);
    expect(next[2]).not.toBe(last);
  });

  it("changes nothing when the price hasn't moved", () => {
    expect(withLivePrice(candles, tick(103, T0 + 40 * MIN), "15m")).toBe(candles);
  });

  it("starts a new candle at the previous close when the interval is over, dropping the oldest", () => {
    const next = withLivePrice(candles, tick(104, T0 + 46 * MIN), "15m");
    expect(next).toHaveLength(3);
    expect(next[0]).toBe(candles[1]);
    expect(next[2]).toEqual({ timestamp: T0 + 45 * MIN, open: 103, high: 104, low: 103, close: 104, volume: 0 });
  });

  it("puts a tick after a gap in its own candle", () => {
    const next = withLivePrice(candles, tick(101, T0 + 2 * 60 * MIN + 5 * MIN), "15m");
    expect(next[2]?.timestamp).toBe(T0 + 2 * 60 * MIN);
    expect(next[2]).toMatchObject({ open: 103, low: 101, close: 101 });
  });

  it("uses the interval to find the candle", () => {
    // Same tick, hourly candles: 12:46 still belongs to the 12:00 candle.
    const hourly = [{ ...last, timestamp: T0 }];
    expect(withLivePrice(hourly, tick(104, T0 + 46 * MIN), "1H")[0]?.timestamp).toBe(T0);
  });
});

describe("candleChange", () => {
  it("measures from open to close", () => {
    const [candle] = makeCandles([110], 100);
    expect(candle && candleChange(candle)).toMatchObject({ amount: 10, fraction: 0.1, direction: "up" });
  });
});

describe("candleEnd", () => {
  it("adds one interval", () => {
    expect(candleEnd(T0, "15m")).toBe(T0 + 15 * MIN);
    expect(candleEnd(T0, "1D")).toBe(T0 + 24 * 60 * MIN);
  });
});

describe("formatCountdown", () => {
  it.each([
    [761_000, "12:41"],
    [59_500, "1:00"],
    [5_000, "0:05"],
    [47_122_000, "13:05:22"],
    [-1_000, "0:00"],
  ])("%i ms → %s", (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});

describe("times", () => {
  // Built from local date parts, so these pass in any time zone.
  const localFourFortyFive = new Date(2026, 10, 26, 16, 45).getTime();

  it("formats candle times in the viewer's time zone, with the date only for daily candles", () => {
    expect(formatCandleTime(localFourFortyFive, "15m")).toBe("Nov 26, 4:45 PM");
    expect(formatCandleTime(localFourFortyFive, "1D")).toBe("Nov 26, 2026");
  });

  it("shifts chart times so the chart's UTC clock shows local wall-clock time", () => {
    // 4:45 PM here becomes "4:45 PM UTC" for the chart, in seconds.
    expect(toChartTime(localFourFortyFive)).toBe(Date.UTC(2026, 10, 26, 16, 45) / 1000);
    expect(formatCandleTime(toChartTime(localFourFortyFive) * 1000, "15m", true)).toBe("Nov 26, 4:45 PM");
  });
});

describe("withAlpha", () => {
  it("turns a hex colour into rgba", () => {
    expect(withAlpha("#0e7a3f", 0.35)).toBe("rgba(14, 122, 63, 0.35)");
    expect(withAlpha(" #fff ", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });

  it("leaves anything that isn't hex alone", () => {
    expect(withAlpha("transparent", 0.5)).toBe("transparent");
  });
});
