import { ServerMessage, WS_PATH } from "@mini-trade/contracts";
import { WebSocket } from "ws";
import type { ServerConfig } from "./config";
import { createMockServer, type MockServer } from "./server";

/** Test helpers: a real server on a random port, with chaos off and fast timers. */

export interface TestServer {
  server: MockServer;
  baseUrl: string;
  wsUrl: string;
  close: () => Promise<void>;
}

export async function startTestServer(overrides: Partial<ServerConfig> = {}): Promise<TestServer> {
  const server = createMockServer({
    chaos: false,
    flushIntervalMs: 20,
    heartbeatIntervalMs: 60_000,
    ...overrides,
  });
  // Bind to the exact address the tests connect to. Listening on all interfaces
  // lets macOS hand out a port that another program holds on 127.0.0.1, and then
  // requests reach that program instead of this server.
  const port = await server.listen(0, "127.0.0.1");
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}${WS_PATH}`,
    close: () => server.close(),
  };
}

/**
 * A WebSocket client that validates every message against the contracts and
 * lets a test wait for the next message matching a predicate.
 */
export class TestSocket {
  readonly messages: ServerMessage[] = [];
  readonly invalid: unknown[] = [];
  private waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];
  closed: Promise<number>;

  private constructor(readonly ws: WebSocket) {
    ws.on("message", (data) => {
      const parsed = ServerMessage.safeParse(JSON.parse(data.toString()));
      if (!parsed.success) {
        this.invalid.push(data.toString());
        return;
      }
      this.messages.push(parsed.data);
      this.waiters = this.waiters.filter((w) => {
        if (!w.match(parsed.data)) return true;
        w.resolve(parsed.data);
        return false;
      });
    });
    this.closed = new Promise((resolve) => ws.on("close", (code) => resolve(code)));
  }

  static open(url: string): Promise<TestSocket> {
    const ws = new WebSocket(url);
    const socket = new TestSocket(ws);
    return new Promise((resolve, reject) => {
      ws.once("open", () => resolve(socket));
      ws.once("error", reject);
    });
  }

  send(message: unknown) {
    this.ws.send(typeof message === "string" ? message : JSON.stringify(message));
  }

  /** Resolves with the first message (already received or upcoming) of this type that matches. */
  next<T extends ServerMessage["type"]>(
    type: T,
    where: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true,
    { timeoutMs = 2_000, after = 0 }: { timeoutMs?: number; after?: number } = {},
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const match = (m: ServerMessage): m is Extract<ServerMessage, { type: T }> =>
      m.type === type && where(m as Extract<ServerMessage, { type: T }>);

    const existing = this.messages.slice(after).find(match);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${type}"`)), timeoutMs);
      this.waiters.push({
        match,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m as Extract<ServerMessage, { type: T }>);
        },
      });
    });
  }

  close() {
    this.ws.close();
  }
}
