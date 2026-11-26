import type { Candle } from "@mini-trade/contracts";
import { brownianBridge, type PricePoint } from "./history";
import { createNormal, createRandom, hashString } from "./random";
import { DAY, YEAR } from "./time";

/** Fine steps per candle: enough for believable wicks, few enough to stay cheap. */
const STEPS_PER_CANDLE = 12;

export interface CandleParams {
  /** Known prices, oldest first, reaching back past the first candle and ending at `now`. */
  path: readonly PricePoint[];
  /** Candle length in ms. */
  interval: number;
  count: number;
  now: number;
  /** Annualised volatility of the stock, for the wicks. */
  volatility: number;
  /** Typical shares traded per day, for the volume. */
  averageVolume: number;
  /** Seed for this stock, so the same inputs always give the same candles. */
  seed: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The latest `count` candles, oldest first, built from the same prices as the
 * line chart. Between two known prices the path is filled in with a seeded
 * Brownian bridge at a fraction of the candle length (that's where the wicks
 * come from), so candles always pass through the line chart's prices and the
 * same inputs always give the same candles. Candles start on multiples of the
 * interval since the epoch, like a real exchange; the last one is still open.
 */
export function buildCandles(params: CandleParams): Candle[] {
  const { interval, count, now } = params;
  const firstStart = Math.floor(now / interval) * interval - (count - 1) * interval;
  const fine = finePath(params, firstStart);

  const candles: Candle[] = [];
  let i = 0;
  // Price just before the first candle: its open.
  while (i < fine.length - 1 && (fine[i + 1] as PricePoint).t <= firstStart) i++;
  let previousClose = (fine[i] as PricePoint).price;

  for (let k = 0; k < count; k++) {
    const start = firstStart + k * interval;
    const end = start + interval;
    const open = previousClose;
    let high = open;
    let low = open;
    let close = open;
    while (i < fine.length && (fine[i] as PricePoint).t < end) {
      const { t, price } = fine[i] as PricePoint;
      if (t >= start) {
        high = Math.max(high, price);
        low = Math.min(low, price);
        close = price;
      }
      i++;
    }
    i = Math.max(0, i - 1); // the last point of this candle also opens the next one
    previousClose = close;

    const elapsed = Math.min(1, (now - start) / interval); // < 1 only for the live candle
    candles.push({
      timestamp: start,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: candleVolume(params, start, open, close, elapsed),
    });
  }
  return candles;
}

/** The known path with Brownian-bridge points added between each pair, from just before `from` to the end. */
function finePath({ path, interval, volatility, seed }: CandleParams, from: number): PricePoint[] {
  const step = interval / STEPS_PER_CANDLE;
  const out: PricePoint[] = [];

  for (let j = 0; j < path.length - 1; j++) {
    const a = path[j] as PricePoint;
    const b = path[j + 1] as PricePoint;
    if (b.t < from) continue;
    if (out.length === 0) out.push(a);

    const steps = Math.max(1, Math.round((b.t - a.t) / step));
    // Seeded by the segment, so a candle doesn't change when later prices arrive.
    const normal = createNormal(createRandom((seed ^ hashString(`${interval}:${a.t}`)) >>> 0));
    const interior = brownianBridge(Math.log(a.price), Math.log(b.price), steps, volatility, (b.t - a.t) / steps / YEAR, normal);
    interior.forEach((logPrice, n) => out.push({ t: a.t + ((n + 1) * (b.t - a.t)) / steps, price: Math.exp(logPrice) }));
    out.push(b);
  }
  if (out.length === 0) {
    const last = path.at(-1);
    if (last) out.push(last);
  }
  return out;
}

/**
 * Synthetic but stable: the stock's typical volume for this much time, with
 * seeded jitter, more on big moves. The live candle has only traded for part
 * of its interval, so its volume grows as it fills.
 */
function candleVolume({ interval, volatility, averageVolume, seed }: CandleParams, start: number, open: number, close: number, elapsed: number): number {
  const base = averageVolume * (interval / DAY);
  const jitter = 0.6 + 0.8 * createRandom((seed ^ hashString(`volume:${interval}:${start}`)) >>> 0)();
  const typicalMove = volatility * Math.sqrt(interval / YEAR);
  const move = typicalMove > 0 ? Math.abs(Math.log(close / open)) / typicalMove : 0;
  const activity = 0.7 + 0.3 * Math.min(move, 3);
  return Math.round(base * jitter * activity * Math.max(0, elapsed));
}
