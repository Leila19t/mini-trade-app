import { createNormal, createRandom, type RandomSource } from "./random";
import { DAY, HOUR, MINUTE, WEEK, YEAR } from "./time";

export interface PricePoint {
  /** Unix ms. */
  t: number;
  /** Price in USD (unrounded). */
  price: number;
}

interface Level {
  interval: number;
  /** How far back from the start time this level must reach. */
  span: number;
}

/**
 * History is generated at several resolutions, coarse to fine. Each finer level
 * is filled in *between* the points of the level above with a Brownian bridge,
 * so every resolution passes through exactly the same prices at shared
 * timestamps: the 1Y chart and the 1M chart can never disagree.
 *
 * Every interval divides the one above it, so all grids line up on `start`.
 */
export const LEVELS: readonly Level[] = [
  { interval: WEEK, span: 262 * WEEK }, // 5Y
  { interval: DAY, span: 366 * DAY }, // 3M, 1Y
  { interval: 4 * HOUR, span: 31 * DAY }, // 1M
  { interval: HOUR, span: 8 * DAY }, // 1W and the list sparkline
  { interval: 5 * MINUTE, span: 25 * HOUR }, // 1D
];

export interface HistoryParams {
  /** Price at `start`; the generated history ends exactly here. */
  price: number;
  volatility: number;
  drift: number;
  /** Unix ms when the engine started. History covers the time before this. */
  start: number;
  seed: number;
}

/** Generates past prices for one stock at every level, keyed by interval (ms). */
export function generateHistory(params: HistoryParams): Map<number, PricePoint[]> {
  const normal = createNormal(createRandom(params.seed));
  const levels = new Map<number, PricePoint[]>();

  const [coarsest, ...finer] = LEVELS;
  if (!coarsest) throw new Error("LEVELS must not be empty");
  let parent = walkBackwards(params, coarsest, normal);
  levels.set(coarsest.interval, parent);

  for (const level of finer) {
    const points = bridgeLevel(parent, level, params, normal);
    levels.set(level.interval, points);
    parent = points;
  }
  return levels;
}

/**
 * Geometric Brownian motion walked backwards from today's price. Working in log
 * space keeps prices positive and makes moves proportional (a 1% move is 1%
 * whether the stock costs $10 or $500).
 */
function walkBackwards(params: HistoryParams, level: Level, normal: RandomSource): PricePoint[] {
  const steps = Math.ceil(level.span / level.interval);
  const dt = level.interval / YEAR;
  const { volatility: sigma, drift: mu } = params;

  const logs = new Array<number>(steps + 1);
  logs[steps] = Math.log(params.price);
  for (let k = steps - 1; k >= 0; k--) {
    const next = logs[k + 1] as number;
    logs[k] = next - ((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * normal());
  }
  return logs.map((logPrice, k) => ({
    t: params.start - (steps - k) * level.interval,
    price: Math.exp(logPrice),
  }));
}

/** Fills the recent part of `parent` in at a finer interval. */
function bridgeLevel(parent: PricePoint[], level: Level, params: HistoryParams, normal: RandomSource): PricePoint[] {
  const from = params.start - level.span;
  const out: PricePoint[] = [];

  for (let i = 0; i < parent.length - 1; i++) {
    const a = parent[i] as PricePoint;
    const b = parent[i + 1] as PricePoint;
    if (b.t <= from) continue;

    const steps = Math.round((b.t - a.t) / level.interval);
    const interior = brownianBridge(Math.log(a.price), Math.log(b.price), steps, params.volatility, level.interval / YEAR, normal);
    if (out.length === 0) out.push(a);
    interior.forEach((logPrice, j) => out.push({ t: a.t + (j + 1) * level.interval, price: Math.exp(logPrice) }));
    out.push(b);
  }
  return out;
}

/**
 * Random path between two fixed log prices: a random walk with the straight
 * line from its start to its end subtracted, then shifted onto the line from
 * `from` to `to`. Returns the `steps - 1` interior values.
 */
export function brownianBridge(from: number, to: number, steps: number, sigma: number, dt: number, normal: RandomSource): number[] {
  const walk = [0];
  for (let j = 1; j <= steps; j++) walk.push((walk[j - 1] as number) + sigma * Math.sqrt(dt) * normal());
  const end = walk[steps] as number;

  const interior: number[] = [];
  for (let j = 1; j < steps; j++) {
    const share = j / steps;
    interior.push(from + (to - from) * share + ((walk[j] as number) - share * end));
  }
  return interior;
}
