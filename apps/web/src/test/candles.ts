import type { Candle } from "@mini-trade/contracts";

const FIFTEEN_MINUTES = 15 * 60_000;
/** Thu Nov 26 2026, 12:00 UTC. */
export const T0 = Date.UTC(2026, 10, 26, 12, 0);

/** 15-minute candles from T0, each closing at the given price and opening at the previous close. */
export function makeCandles(closes: readonly number[], first = 100): Candle[] {
  let open = first;
  return closes.map((close, i) => {
    const candle = {
      timestamp: T0 + i * FIFTEEN_MINUTES,
      open,
      high: Math.max(open, close) + 0.5,
      low: Math.min(open, close) - 0.5,
      close,
      volume: 1_000 * (i + 1),
    };
    open = close;
    return candle;
  });
}
