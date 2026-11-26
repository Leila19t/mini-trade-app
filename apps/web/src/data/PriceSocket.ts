import { ServerMessage, type ClientMessage, type PriceTick, type Ticker } from "@mini-trade/contracts";

/** "offline": still retrying, but enough attempts have failed that the user should know. */
export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export interface ConnectionState {
  status: ConnectionStatus;
  /** When the next reconnect attempt starts (epoch ms), while reconnecting. */
  retryAt: number | null;
}

/** The subset of WebSocket the client uses, so tests can pass a fake. */
export interface SocketLike {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: string): void;
  close(): void;
}

export interface PriceSocketOptions {
  url: string;
  onPrices: (ticks: PriceTick[]) => void;
  onStatus: (state: ConnectionState) => void;
  createSocket?: (url: string) => SocketLike;
  /** Reconnect delays: doubles from `initialMs` up to `maxMs`, with jitter. */
  backoff?: { initialMs: number; maxMs: number };
  /** Give up on a connection with no `welcome` after this long. */
  connectTimeoutMs?: number;
  /** Failed attempts in a row before the status says "offline" instead of "reconnecting". */
  offlineAfterAttempts?: number;
  random?: () => number;
}

/** Missed heartbeats before the socket counts as dead (the server sends one every interval). */
const MISSED_HEARTBEATS = 2.5;

/**
 * Live prices over WebSocket. Plain TypeScript, no React: hooks talk to it.
 *
 * - Reconnects with exponential backoff and jitter after any drop.
 * - Detects silent stalls: if nothing arrives for ~2.5 heartbeat intervals,
 *   the socket is treated as dead and replaced.
 * - Subscriptions are ref-counted: two rows showing AAPL make one server
 *   subscription, and it ends only when both unmount. Changes within the same
 *   task are batched into one message, and everything is resubscribed after
 *   a reconnect (the server replies with a fresh price snapshot).
 */
export class PriceSocket {
  private readonly options: Required<PriceSocketOptions>;
  private socket: SocketLike | null = null;
  /** True once the current socket said `welcome`: only then can we send. */
  private welcomed = false;
  private stopped = true;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private livenessTimer: ReturnType<typeof setTimeout> | undefined;
  private livenessTimeoutMs: number;

  /** How many subscribers each symbol has. */
  private readonly counts = new Map<Ticker, number>();
  private readonly pendingSubscribe = new Set<Ticker>();
  private readonly pendingUnsubscribe = new Set<Ticker>();
  private flushQueued = false;

  constructor(options: PriceSocketOptions) {
    this.options = {
      createSocket: (url) => new WebSocket(url),
      backoff: { initialMs: 500, maxMs: 10_000 },
      connectTimeoutMs: 10_000,
      offlineAfterAttempts: 4,
      random: Math.random,
      ...options,
    };
    this.livenessTimeoutMs = this.options.connectTimeoutMs;
  }

  connect() {
    if (!this.stopped) return;
    this.stopped = false;
    this.attempt = 0;
    this.open();
  }

  /** Closes for good (until `connect()` again). Subscriptions are kept. */
  disconnect() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    this.dropSocket();
  }

  /** Skips the backoff wait and reconnects now ("Retry now"). No-op while connected or mid-attempt. */
  retryNow() {
    if (this.stopped || this.socket) return;
    clearTimeout(this.reconnectTimer);
    this.open();
  }

  /** Start receiving prices for `symbols`. Returns the matching unsubscribe. */
  subscribe(symbols: readonly Ticker[]): () => void {
    for (const symbol of symbols) {
      const count = this.counts.get(symbol) ?? 0;
      this.counts.set(symbol, count + 1);
      if (count === 0) this.queueChange(symbol, "subscribe");
    }

    let active = true;
    return () => {
      if (!active) return; // calling it twice must not unsubscribe someone else
      active = false;
      for (const symbol of symbols) {
        const count = this.counts.get(symbol) ?? 0;
        if (count <= 1) {
          this.counts.delete(symbol);
          this.queueChange(symbol, "unsubscribe");
        } else {
          this.counts.set(symbol, count - 1);
        }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle

  /** Status while not live: stays "offline" across attempts once it got there, so the badge doesn't flicker. */
  private retryStatus(): ConnectionStatus {
    if (this.attempt === 0) return "connecting";
    return this.attempt >= this.options.offlineAfterAttempts ? "offline" : "reconnecting";
  }

  private open() {
    this.options.onStatus({ status: this.retryStatus(), retryAt: null });

    const socket = this.options.createSocket(this.options.url);
    this.socket = socket;
    socket.onmessage = (event) => this.onMessage(event);
    socket.onclose = () => this.onLost();
    socket.onerror = () => this.onLost();
    // No `welcome` in time counts as a failed attempt.
    this.livenessTimeoutMs = this.options.connectTimeoutMs;
    this.resetLiveness();
  }

  /** Any sign of trouble: drop this socket and schedule the next attempt. */
  private onLost() {
    this.dropSocket();
    if (this.stopped) return;

    const { initialMs, maxMs } = this.options.backoff;
    const base = Math.min(maxMs, initialMs * 2 ** this.attempt);
    const delay = Math.round(base * (0.5 + this.options.random() * 0.5)); // jitter: 50–100%
    this.attempt += 1;

    this.options.onStatus({ status: this.retryStatus(), retryAt: Date.now() + delay });
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  /** Detaches handlers first, so the old socket can't report anything after this. */
  private dropSocket() {
    clearTimeout(this.livenessTimer);
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    this.welcomed = false;
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
    socket.close();
  }

  private resetLiveness() {
    clearTimeout(this.livenessTimer);
    this.livenessTimer = setTimeout(() => this.onLost(), this.livenessTimeoutMs);
  }

  // ---------------------------------------------------------------------------
  // Messages

  private onMessage(event: MessageEvent) {
    this.resetLiveness(); // any message proves the socket is alive

    let json: unknown;
    try {
      json = typeof event.data === "string" ? JSON.parse(event.data) : undefined;
    } catch {
      json = undefined;
    }
    const parsed = ServerMessage.safeParse(json);
    if (!parsed.success) {
      console.warn("Dropped an invalid socket message", parsed.error);
      return;
    }

    const message = parsed.data;
    switch (message.type) {
      case "welcome":
        this.attempt = 0;
        this.welcomed = true;
        this.livenessTimeoutMs = message.heartbeatIntervalMs * MISSED_HEARTBEATS;
        this.resetLiveness();
        this.resubscribeAll();
        this.options.onStatus({ status: "live", retryAt: null });
        break;
      case "prices":
        this.options.onPrices(message.ticks);
        break;
      case "error":
        console.warn(`Socket error ${message.code}: ${message.message}`);
        break;
      case "heartbeat":
      case "subscribed":
        break; // liveness already reset above
    }
  }

  // ---------------------------------------------------------------------------
  // Subscriptions

  private queueChange(symbol: Ticker, change: "subscribe" | "unsubscribe") {
    // A subscribe and an unsubscribe in the same task cancel out.
    const [add, opposite] =
      change === "subscribe"
        ? [this.pendingSubscribe, this.pendingUnsubscribe]
        : [this.pendingUnsubscribe, this.pendingSubscribe];
    if (!opposite.delete(symbol)) add.add(symbol);

    if (this.flushQueued) return;
    this.flushQueued = true;
    queueMicrotask(() => this.flush());
  }

  private flush() {
    this.flushQueued = false;
    if (!this.welcomed) return; // the welcome handler resubscribes everything

    if (this.pendingUnsubscribe.size > 0) {
      this.send({ type: "unsubscribe", symbols: [...this.pendingUnsubscribe] });
    }
    if (this.pendingSubscribe.size > 0) {
      this.send({ type: "subscribe", symbols: [...this.pendingSubscribe] });
    }
    this.pendingSubscribe.clear();
    this.pendingUnsubscribe.clear();
  }

  private resubscribeAll() {
    this.pendingSubscribe.clear();
    this.pendingUnsubscribe.clear();
    if (this.counts.size > 0) this.send({ type: "subscribe", symbols: [...this.counts.keys()] });
  }

  private send(message: ClientMessage) {
    this.socket?.send(JSON.stringify(message));
  }
}
