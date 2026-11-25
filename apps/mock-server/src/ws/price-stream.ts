import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { ClientMessage, type PriceTick, type ServerMessage, type Ticker } from "@mini-trade/contracts";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import type { Chaos } from "../chaos";
import type { PriceEngine } from "../engine";

interface Options {
  engine: PriceEngine;
  chaos: Chaos;
  flushIntervalMs: number;
  heartbeatIntervalMs: number;
}

interface Connection {
  socket: WebSocket;
  symbols: Set<Ticker>;
  /** Set by a simulated silent drop: the socket stays open but we stop sending. */
  silent: boolean;
  /** Cleared on each heartbeat, set again by the client's pong. */
  alive: boolean;
  dropTimer?: NodeJS.Timeout;
}

/** Client messages are tiny; anything bigger is a bug or abuse. */
const MAX_PAYLOAD_BYTES = 16 * 1024;
/** A silently dropped socket is closed after this long, in case the client never notices. */
const SILENT_CLEANUP_MS = 60_000;

/**
 * Live prices over WebSocket. One loop ticks the engine and fans each batch
 * out to the connections subscribed to those symbols, as a single `prices`
 * message per connection per flush.
 */
export class PriceStream {
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  private readonly connections = new Set<Connection>();
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(private readonly options: Options) {
    this.wss.on("connection", (socket) => this.onConnection(socket));
    this.timers.push(
      setInterval(() => this.flush(), options.flushIntervalMs),
      setInterval(() => this.heartbeat(), options.heartbeatIntervalMs),
    );
  }

  /** Hand an HTTP upgrade request over to the WebSocket server. */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => this.wss.emit("connection", ws, req));
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  close() {
    for (const timer of this.timers) clearInterval(timer);
    for (const connection of this.connections) {
      clearTimeout(connection.dropTimer);
      connection.socket.terminate();
    }
    this.connections.clear();
    this.wss.close();
  }

  // ---------------------------------------------------------------------------

  private onConnection(socket: WebSocket) {
    const connection: Connection = { socket, symbols: new Set(), silent: false, alive: true };
    this.connections.add(connection);

    socket.on("message", (data, isBinary) => this.onMessage(connection, data, isBinary));
    socket.on("pong", () => {
      connection.alive = true;
    });
    socket.on("close", () => this.remove(connection));
    socket.on("error", () => this.remove(connection));

    this.send(connection, {
      type: "welcome",
      serverTime: Date.now(),
      heartbeatIntervalMs: this.options.heartbeatIntervalMs,
    });
    this.scheduleDrop(connection);
  }

  private onMessage(connection: Connection, data: RawData, isBinary: boolean) {
    let json: unknown;
    try {
      json = isBinary ? undefined : JSON.parse(data.toString());
    } catch {
      json = undefined;
    }
    const parsed = ClientMessage.safeParse(json);
    if (!parsed.success) {
      this.send(connection, { type: "error", code: "BAD_MESSAGE", message: "Expected a subscribe or unsubscribe message" });
      return;
    }

    const message = parsed.data;
    if (message.type === "unsubscribe") {
      for (const symbol of message.symbols) connection.symbols.delete(symbol);
      this.sendSubscribed(connection);
      return;
    }

    const known = message.symbols.filter((s) => this.options.engine.has(s));
    const unknown = message.symbols.filter((s) => !this.options.engine.has(s));
    if (unknown.length > 0) {
      this.send(connection, { type: "error", code: "UNKNOWN_SYMBOL", message: `Unknown symbols: ${unknown.join(", ")}` });
    }

    const added = known.filter((s) => !connection.symbols.has(s));
    for (const symbol of added) connection.symbols.add(symbol);
    this.sendSubscribed(connection);

    // Snapshot of the newly added symbols, so a (re)subscribing client is current
    // straight away instead of waiting for each stock's next move.
    const snapshot = added.flatMap((s) => this.options.engine.quote(s) ?? []);
    if (snapshot.length > 0) this.send(connection, { type: "prices", ticks: snapshot });
  }

  private sendSubscribed(connection: Connection) {
    this.send(connection, { type: "subscribed", symbols: [...connection.symbols] });
  }

  private flush() {
    const ticks = this.options.engine.tick();
    if (ticks.length === 0 || this.connections.size === 0) return;

    const bySymbol = new Map<Ticker, PriceTick>(ticks.map((t) => [t.symbol, t]));
    for (const connection of this.connections) {
      const batch = [...connection.symbols].flatMap((s) => bySymbol.get(s) ?? []);
      if (batch.length > 0) this.send(connection, { type: "prices", ticks: batch });
    }
  }

  /**
   * App-level heartbeat for the client (browsers can't see ping frames), plus a
   * protocol ping so the server notices clients that vanished without closing.
   */
  private heartbeat() {
    for (const connection of this.connections) {
      if (connection.silent) continue; // being stalled on purpose, see scheduleDrop
      if (!connection.alive) {
        connection.socket.terminate();
        continue;
      }
      connection.alive = false;
      connection.socket.ping();
      this.send(connection, { type: "heartbeat", serverTime: Date.now() });
    }
  }

  private scheduleDrop(connection: Connection) {
    const drop = this.options.chaos.socketDrop();
    if (!drop) return;
    connection.dropTimer = setTimeout(() => {
      if (drop.kind === "close") {
        connection.socket.terminate();
      } else {
        // Go quiet without closing: only the client's heartbeat timeout can notice.
        // If the client never gives up on it, clean up well after it should have.
        connection.silent = true;
        connection.dropTimer = setTimeout(() => connection.socket.terminate(), SILENT_CLEANUP_MS);
      }
    }, drop.afterMs);
  }

  private send(connection: Connection, message: ServerMessage) {
    if (connection.silent || connection.socket.readyState !== connection.socket.OPEN) return;
    connection.socket.send(JSON.stringify(message));
  }

  private remove(connection: Connection) {
    clearTimeout(connection.dropTimer);
    this.connections.delete(connection);
  }
}
