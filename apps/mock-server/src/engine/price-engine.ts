import {
  CANDLE_COUNT,
  CANDLE_INTERVAL_MS,
  type CandleInterval,
  type CandlesResponse,
  type HistoryResponse,
  type PriceTick,
  type Range,
  type StockDetail,
  type StockSummary,
  type Ticker,
} from "@mini-trade/contracts";
import { buildCandles } from "./candles";
import { generateHistory, LEVELS, type PricePoint } from "./history";
import { createNormal, createRandom, hashString, type RandomSource } from "./random";
import { RANGE_CONFIG } from "./ranges";
import { DAY, HOUR, MINUTE, YEAR } from "./time";
import { UNIVERSE, type StockDefinition } from "./universe";

export interface PriceEngineOptions {
  /** Same seed → same history and same tick sequence. */
  seed?: number;
  /** Clock, injectable so tests control time. */
  now?: () => number;
  universe?: readonly StockDefinition[];
  /**
   * Live ticks use this multiple of each stock's real volatility. Real
   * second-to-second moves are a fraction of a cent, which looks frozen in a
   * demo; ~15× makes prices visibly alive while history stays realistic.
   */
  tickVolatilityScale?: number;
  /** Chance that a given stock moves on a given tick, so not every row flashes at once. */
  tickProbability?: number;
}

interface StockState {
  def: StockDefinition;
  /** This stock's own seed, derived from the engine seed. */
  seed: number;
  /** Generated past, keyed by interval (ms). Ends at the engine start time. */
  history: Map<number, PricePoint[]>;
  /** Live prices since start, one sample per minute (the latest price in that minute). */
  live: PricePoint[];
  price: number;
  updatedAt: number;
  random: RandomSource;
  normal: RandomSource;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The mock market. One seeded geometric Brownian motion per stock produces
 * both the generated history and the live ticks, so a chart's last point is
 * always the live price.
 */
export class PriceEngine {
  readonly start: number;
  private readonly now: () => number;
  private readonly tickVolatilityScale: number;
  private readonly tickProbability: number;
  private readonly stocks = new Map<Ticker, StockState>();

  constructor(options: PriceEngineOptions = {}) {
    const seed = options.seed ?? 42;
    this.now = options.now ?? Date.now;
    this.tickVolatilityScale = options.tickVolatilityScale ?? 15;
    this.tickProbability = options.tickProbability ?? 0.5;
    this.start = this.now();

    for (const def of options.universe ?? UNIVERSE) {
      const stockSeed = (seed ^ hashString(def.symbol)) >>> 0;
      const random = createRandom(stockSeed ^ 0x9e3779b9);
      this.stocks.set(def.symbol, {
        def,
        seed: stockSeed,
        history: generateHistory({ price: def.price, volatility: def.volatility, drift: def.drift, start: this.start, seed: stockSeed }),
        live: [],
        price: def.price,
        updatedAt: this.start,
        random,
        normal: createNormal(random),
      });
    }
  }

  symbols(): Ticker[] {
    return [...this.stocks.keys()];
  }

  has(symbol: string): boolean {
    return this.stocks.has(symbol);
  }

  /** Moves stocks forward to the current time. Returns only the prices that changed. */
  tick(): PriceTick[] {
    const now = this.now();
    const ticks: PriceTick[] = [];

    for (const state of this.stocks.values()) {
      if (now <= state.updatedAt || state.random() >= this.tickProbability) continue;

      const dt = (now - state.updatedAt) / YEAR;
      const sigma = state.def.volatility * this.tickVolatilityScale;
      const mu = state.def.drift;
      state.price *= Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * state.normal());
      state.updatedAt = now;
      this.recordLive(state, now);

      ticks.push({ symbol: state.def.symbol, price: round2(state.price), timestamp: now });
    }
    return ticks;
  }

  /** Current price as a tick, e.g. to send a snapshot right after someone subscribes. */
  quote(symbol: string): PriceTick | undefined {
    const state = this.stocks.get(symbol);
    return state && { symbol: state.def.symbol, price: round2(state.price), timestamp: state.updatedAt };
  }

  listSummaries(): StockSummary[] {
    return [...this.stocks.values()].map((state) => this.summary(state));
  }

  getSummary(symbol: string): StockSummary | undefined {
    const state = this.stocks.get(symbol);
    return state && this.summary(state);
  }

  getDetail(symbol: string): StockDetail | undefined {
    const state = this.stocks.get(symbol);
    if (!state) return undefined;

    const now = this.now();
    const day = this.window(state, 5 * MINUTE, DAY);
    const year = this.window(state, DAY, 365 * DAY);
    const dayPrices = day.map((p) => p.price);
    const yearPrices = year.map((p) => p.price);
    const { def } = state;

    return {
      symbol: def.symbol,
      name: def.name,
      exchange: def.exchange,
      currency: "USD",
      price: round2(state.price),
      updatedAt: state.updatedAt,
      stats: {
        price24hAgo: round2(this.priceAt(state, now - DAY)),
        high24h: round2(Math.max(...dayPrices)),
        low24h: round2(Math.min(...dayPrices)),
        week52High: round2(Math.max(...yearPrices)),
        week52Low: round2(Math.min(...yearPrices)),
        volume24h: this.volume24h(state, now),
        marketCap: Math.round(state.price * def.sharesOutstanding),
      },
    };
  }

  getHistory(symbol: string, range: Range): HistoryResponse | undefined {
    const state = this.stocks.get(symbol);
    if (!state) return undefined;

    const { window, interval } = RANGE_CONFIG[range];
    const points = this.window(state, interval, window).map((p) => ({ timestamp: p.t, price: round2(p.price) }));
    return { symbol: state.def.symbol, range, points };
  }

  /** The latest candles for the Pro chart, from the same prices as the history. */
  getCandles(symbol: string, interval: CandleInterval): CandlesResponse | undefined {
    const state = this.stocks.get(symbol);
    if (!state) return undefined;

    const now = this.now();
    const ms = CANDLE_INTERVAL_MS[interval];
    const from = Math.floor(now / ms) * ms - CANDLE_COUNT * ms;
    const candles = buildCandles({
      path: this.pricesSince(state, from),
      interval: ms,
      count: CANDLE_COUNT,
      now,
      volatility: state.def.volatility,
      averageVolume: state.def.averageVolume,
      seed: state.seed,
    });
    return { symbol: state.def.symbol, interval, candles };
  }

  // ---------------------------------------------------------------------------

  /**
   * Every known price from just before `from` to now: the finest generated
   * history level that reaches back far enough, then the live samples, then
   * the current price.
   */
  private pricesSince(state: StockState, from: number): PricePoint[] {
    const now = this.now();
    const reaching = LEVELS.filter((l) => this.start - l.span <= from); // coarse to fine
    const level = reaching[reaching.length - 1] ?? LEVELS[0];
    const generated = level ? (state.history.get(level.interval) ?? []) : [];
    let firstNeeded = 0; // last generated point at or before `from`
    generated.forEach((p, i) => {
      if (p.t <= from) firstNeeded = i;
    });
    const past = generated.slice(firstNeeded).filter((p) => p.t <= this.start);

    const points = [...past, ...state.live.filter((p) => p.t > this.start)].map((p) => ({ ...p }));
    const last = points.at(-1);
    if (!last || last.t < now) points.push({ t: now, price: state.price });
    else last.price = state.price;
    return points;
  }

  private summary(state: StockState): StockSummary {
    const now = this.now();
    const { def } = state;
    return {
      symbol: def.symbol,
      name: def.name,
      exchange: def.exchange,
      currency: "USD",
      price: round2(state.price),
      price24hAgo: round2(this.priceAt(state, now - DAY)),
      trend: this.window(state, HOUR, DAY).map((p) => round2(p.price)),
      updatedAt: state.updatedAt,
    };
  }

  /** Keeps one live sample per minute: plenty for every chart, bounded memory. */
  private recordLive(state: StockState, t: number) {
    const last = state.live.at(-1);
    if (last && Math.floor(last.t / MINUTE) === Math.floor(t / MINUTE)) {
      last.t = t;
      last.price = state.price;
    } else {
      state.live.push({ t, price: state.price });
    }
  }

  /**
   * Prices at `interval` spacing over the last `window` ms, ending with the
   * current price. Before the engine started they come from generated history;
   * after that, from live samples snapped to the same grid.
   */
  private window(state: StockState, interval: number, window: number): PricePoint[] {
    const now = this.now();
    const from = now - window;
    const past = (state.history.get(interval) ?? [])
      .filter((p) => p.t >= from && p.t <= this.start)
      .map((p) => ({ ...p })); // copies: the generated history must never be mutated

    // Live samples: keep the last one before each grid time after `start`.
    const byGrid = new Map<number, PricePoint>();
    for (const sample of state.live) {
      const gridTime = this.start + Math.ceil((sample.t - this.start) / interval) * interval;
      if (gridTime <= now && gridTime >= from) byGrid.set(gridTime, { t: gridTime, price: sample.price });
    }
    const live = [...byGrid.values()].filter((p) => p.t > this.start);

    const points = [...past, ...live];
    const last = points.at(-1);
    if (!last || last.t < now) points.push({ t: now, price: state.price });
    else last.price = state.price;
    return points;
  }

  /** Latest known price at or before `t`. */
  private priceAt(state: StockState, t: number): number {
    const candidates = [...(state.history.get(5 * MINUTE) ?? []), ...state.live];
    let price = candidates[0]?.price ?? state.price;
    for (const p of candidates) {
      if (p.t > t) break;
      price = p.price;
    }
    return price;
  }

  /** Synthetic but stable: changes once an hour, around the stock's typical daily volume. */
  private volume24h(state: StockState, now: number): number {
    const hourSeed = hashString(`${state.def.symbol}:${Math.floor(now / HOUR)}`);
    const jitter = 0.75 + 0.5 * createRandom(hourSeed)();
    return Math.round(state.def.averageVolume * jitter);
  }
}
