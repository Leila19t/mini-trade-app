import { CANDLE_INTERVAL_MS, type Candle, type CandleInterval, type PriceTick } from "@mini-trade/contracts";
import { changeBetween, type Change } from "./utils";

/**
 * Pure helpers for the Pro (candlestick) chart: live updates, time and
 * countdown formatting. No React, no DOM, so they can be unit tested.
 */

/**
 * Folds a live tick into the candles. A tick inside the last candle moves its
 * close (and high / low); a tick after it starts a new candle that opens at the
 * previous close, and the oldest candle drops off so the count stays the same.
 * Unchanged candles keep their identity, so the chart can update just the last one.
 */
export function withLivePrice(
  candles: readonly Candle[],
  tick: PriceTick | undefined,
  interval: CandleInterval,
): readonly Candle[] {
  const last = candles.at(-1);
  if (!tick || !last || tick.timestamp < last.timestamp) return candles;

  const ms = CANDLE_INTERVAL_MS[interval];
  const start = Math.floor(tick.timestamp / ms) * ms;
  const { price } = tick;

  if (start === last.timestamp) {
    if (price === last.close) return candles;
    const moved = { ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) };
    return [...candles.slice(0, -1), moved];
  }

  const next: Candle = {
    timestamp: start,
    open: last.close,
    high: Math.max(last.close, price),
    low: Math.min(last.close, price),
    close: price,
    volume: 0,
  };
  return [...candles.slice(1), next];
}

/** Change from open to close, for the legend and the candle colour. */
export function candleChange(candle: Candle): Change {
  return changeBetween(candle.close, candle.open);
}

/** When the candle that started at `timestamp` closes. */
export function candleEnd(timestamp: number, interval: CandleInterval): number {
  return timestamp + CANDLE_INTERVAL_MS[interval];
}

/** Time left until the live candle closes: "12:41", or "13:05:22" for daily candles. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}

const withTime = (timeZone?: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });
const withYear = (timeZone?: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone });

const local = { time: withTime(), day: withYear() };
const utc = { time: withTime("UTC"), day: withYear("UTC") };

/**
 * When a candle starts: "Nov 26, 4:45 PM", or "Nov 26, 2026" for daily candles.
 * Pass `inUtc` for chart times, which are already shifted to local wall-clock time.
 */
export function formatCandleTime(timestamp: number, interval: CandleInterval, inUtc = false): string {
  const formats = inUtc ? utc : local;
  return interval === "1D" ? formats.day.format(timestamp) : formats.time.format(timestamp);
}

/**
 * The chart library draws times in UTC. Shifting each timestamp by the local
 * UTC offset makes its axis and crosshair show the viewer's local time.
 * Returns seconds, which is what the library expects.
 */
export function toChartTime(timestamp: number): number {
  const offset = new Date(timestamp).getTimezoneOffset() * 60_000;
  return Math.floor((timestamp - offset) / 1000);
}

/** "#0e7a3f" + 0.35 → "rgba(14, 122, 63, 0.35)". Used for the volume bars. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.trim().replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
