import type { Ticker } from "@mini-trade/contracts";
import type { ChaosOptions } from "./chaos";

export interface ServerConfig {
  port: number;
  /** Seed for the price engine: same seed, same market. */
  seed: number;
  /** How often the engine ticks and changed prices are flushed to sockets, as one `prices` message. */
  flushIntervalMs: number;
  /** How often the server sends a heartbeat. The client treats ~2 missed heartbeats as a dead socket. */
  heartbeatIntervalMs: number;
  /** Starting watchlist for the demo user, so the first run doesn't open on an empty state. */
  initialWatchlist: Ticker[];
  /** Simulated failures. `false` turns them all off (tests). */
  chaos: ChaosOptions | false;
}

export const DEFAULT_CHAOS: ChaosOptions = {
  latencyMs: { min: 80, max: 450 },
  errorRate: 0.02,
  socketDropAfterMs: { min: 45_000, max: 120_000 },
  silentDropShare: 0.3,
};

export const DEFAULT_CONFIG: ServerConfig = {
  port: 4000,
  seed: 42,
  flushIntervalMs: 2000,
  heartbeatIntervalMs: 5_000,
  initialWatchlist: ["AAPL", "NVDA", "TSLA"],
  chaos: DEFAULT_CHAOS,
};

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && Number.isInteger(parsed) ? parsed : fallback;
};

/**
 * Reads overrides from the environment:
 * PORT, SEED, CHAOS=off (no latency, errors or drops), ERROR_RATE (0–1).
 */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const errorRate = Number(env.ERROR_RATE ?? DEFAULT_CHAOS.errorRate);
  const chaos =
    env.CHAOS === "off"
      ? false
      : { ...DEFAULT_CHAOS, errorRate: errorRate >= 0 && errorRate <= 1 ? errorRate : DEFAULT_CHAOS.errorRate };

  return {
    ...DEFAULT_CONFIG,
    port: int(env.PORT, DEFAULT_CONFIG.port),
    seed: int(env.SEED, DEFAULT_CONFIG.seed),
    chaos,
  };
}
