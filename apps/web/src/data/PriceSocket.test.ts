import type { ClientMessage } from "@mini-trade/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PriceSocket, type SocketLike } from "./PriceSocket";

/** A socket the test controls: it records what the client sends and can deliver server messages. */
class FakeSocket implements SocketLike {
  onopen: SocketLike["onopen"] = null;
  onmessage: SocketLike["onmessage"] = null;
  onclose: SocketLike["onclose"] = null;
  onerror: SocketLike["onerror"] = null;
  readonly sent: ClientMessage[] = [];
  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientMessage);
  }
  close() {}
  receive(message: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(message) }));
  }
}

let socket: FakeSocket;

function connect(unsubscribeDelayMs = 10_000) {
  const client = new PriceSocket({
    url: "ws://test/ws",
    onPrices: () => {},
    onStatus: () => {},
    createSocket: () => (socket = new FakeSocket()),
    unsubscribeDelayMs,
  });
  client.connect();
  socket.onopen?.(new Event("open"));
  socket.receive({ type: "welcome", serverTime: 1_700_000_000_000, heartbeatIntervalMs: 15_000 });
  return client;
}

/** Lets the batched subscribe / unsubscribe go out. */
const flush = () => Promise.resolve();

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("PriceSocket subscriptions", () => {
  it("batches subscriptions from the same task into one message, counting duplicates once", async () => {
    const client = connect();
    client.subscribe(["AAPL", "MSFT"]);
    client.subscribe(["AAPL"]);
    await flush();
    expect(socket.sent).toEqual([{ type: "subscribe", symbols: ["AAPL", "MSFT"] }]);
  });

  it("keeps a symbol for a grace period after its last subscriber leaves, then unsubscribes", async () => {
    const client = connect();
    const stop = client.subscribe(["AAPL"]);
    await flush();
    stop();
    await flush();
    expect(socket.sent).toHaveLength(1); // still subscribed

    vi.advanceTimersByTime(10_000);
    await flush();
    expect(socket.sent.at(-1)).toEqual({ type: "unsubscribe", symbols: ["AAPL"] });
  });

  it("sends nothing when a symbol comes back within the grace period (e.g. back-navigation)", async () => {
    const client = connect();
    const stop = client.subscribe(["AAPL"]);
    await flush();
    stop();
    vi.advanceTimersByTime(5_000);
    client.subscribe(["AAPL"]);
    vi.advanceTimersByTime(20_000);
    await flush();
    expect(socket.sent).toEqual([{ type: "subscribe", symbols: ["AAPL"] }]);
  });

  it("unsubscribes symbols that left together in one message, like rows unmounting one by one", async () => {
    const client = connect();
    const stops = ["AAPL", "MSFT", "NVDA"].map((symbol) => client.subscribe([symbol]));
    await flush();
    for (const stop of stops) stop();

    vi.advanceTimersByTime(10_000);
    await flush();
    expect(socket.sent.slice(1)).toEqual([{ type: "unsubscribe", symbols: ["AAPL", "MSFT", "NVDA"] }]);
  });
});
