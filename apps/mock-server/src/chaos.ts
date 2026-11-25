/**
 * Simulated network trouble, so the client is built against a backend that
 * misbehaves the way real ones do: slow responses, occasional 503s and
 * WebSocket connections that drop.
 */

export interface Range {
  min: number;
  max: number;
}

export interface ChaosOptions {
  /** Delay added to every HTTP response. */
  latencyMs: Range;
  /** Share of API requests (0–1) that fail with 503 UNAVAILABLE. */
  errorRate: number;
  /** Each socket is dropped once, at a random time in this window after it connects. */
  socketDropAfterMs: Range;
  /**
   * Share of drops (0–1) that go silent instead of closing: the server stops
   * sending but keeps the TCP connection open, like a stalled mobile network.
   * Only the client's heartbeat timeout can detect these.
   */
  silentDropShare: number;
}

export type SocketDrop = { kind: "close" | "silent"; afterMs: number };

/** Decides when things go wrong. `random` is injectable so tests can force each outcome. */
export class Chaos {
  constructor(
    private readonly options: ChaosOptions | false,
    private readonly random: () => number = Math.random,
  ) {}

  get enabled(): boolean {
    return this.options !== false;
  }

  latency(): number {
    if (!this.options) return 0;
    return Math.round(this.between(this.options.latencyMs));
  }

  shouldFail(): boolean {
    return this.options !== false && this.random() < this.options.errorRate;
  }

  /** When and how this new socket will drop, or `undefined` if it won't. */
  socketDrop(): SocketDrop | undefined {
    if (!this.options) return undefined;
    const afterMs = Math.round(this.between(this.options.socketDropAfterMs));
    const kind = this.random() < this.options.silentDropShare ? "silent" : "close";
    return { kind, afterMs };
  }

  private between({ min, max }: Range): number {
    return min + (max - min) * this.random();
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
