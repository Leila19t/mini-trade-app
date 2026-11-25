import { afterEach, describe, expect, it } from "vitest";
import { startTestServer, TestSocket, type TestServer } from "../testing";

let t: TestServer | undefined;
const sockets: TestSocket[] = [];

async function setup(overrides: Parameters<typeof startTestServer>[0] = {}) {
  t = await startTestServer(overrides);
  const socket = await TestSocket.open(t.wsUrl);
  sockets.push(socket);
  return { t, socket };
}

afterEach(async () => {
  for (const s of sockets.splice(0)) s.close();
  await t?.close();
  t = undefined;
});

describe("PriceStream", () => {
  it("sends a welcome with the heartbeat interval on connect", async () => {
    const { socket } = await setup({ heartbeatIntervalMs: 1234 });
    const welcome = await socket.next("welcome");
    expect(welcome.heartbeatIntervalMs).toBe(1234);
  });

  it("confirms subscriptions and sends a snapshot of the new symbols straight away", async () => {
    const { socket } = await setup();
    socket.send({ type: "subscribe", symbols: ["AAPL", "MSFT"] });
    const subscribed = await socket.next("subscribed");
    expect(subscribed.symbols).toEqual(["AAPL", "MSFT"]);
    const snapshot = await socket.next("prices");
    expect(snapshot.ticks.map((tick) => tick.symbol).sort()).toEqual(["AAPL", "MSFT"]);
  });

  it("only streams prices for subscribed symbols, batched per flush", async () => {
    const { socket } = await setup();
    socket.send({ type: "subscribe", symbols: ["AAPL", "NVDA"] });
    await socket.next("subscribed");
    // Wait for a few flushes after the snapshot.
    const from = socket.messages.length;
    await new Promise((r) => setTimeout(r, 300));
    const batches = socket.messages.slice(from).filter((m) => m.type === "prices");
    expect(batches.length).toBeGreaterThan(2);
    for (const batch of batches) {
      for (const tick of batch.ticks) expect(["AAPL", "NVDA"]).toContain(tick.symbol);
      // One tick per symbol per batch.
      expect(new Set(batch.ticks.map((tick) => tick.symbol)).size).toBe(batch.ticks.length);
    }
    expect(socket.invalid).toEqual([]);
  });

  it("subscribing twice is a no-op and unsubscribe stops the stream", async () => {
    const { socket } = await setup();
    socket.send({ type: "subscribe", symbols: ["AAPL"] });
    await socket.next("subscribed");
    socket.send({ type: "subscribe", symbols: ["AAPL"] });
    const again = await socket.next("subscribed", undefined, { after: socket.messages.length });
    expect(again.symbols).toEqual(["AAPL"]);

    socket.send({ type: "unsubscribe", symbols: ["AAPL"] });
    const after = await socket.next("subscribed", (m) => m.symbols.length === 0);
    expect(after.symbols).toEqual([]);
    const from = socket.messages.length;
    await new Promise((r) => setTimeout(r, 150));
    expect(socket.messages.slice(from).filter((m) => m.type === "prices")).toEqual([]);
  });

  it("reports unknown symbols but still subscribes the known ones", async () => {
    const { socket } = await setup();
    socket.send({ type: "subscribe", symbols: ["ZZZZ", "AAPL"] });
    const error = await socket.next("error");
    expect(error.code).toBe("UNKNOWN_SYMBOL");
    expect(error.message).toContain("ZZZZ");
    expect((await socket.next("subscribed")).symbols).toEqual(["AAPL"]);
  });

  it.each([
    ["not JSON", "hello"],
    ["an unknown type", { type: "buy", symbols: ["AAPL"] }],
    ["an invalid ticker", { type: "subscribe", symbols: ["aapl"] }],
    ["an empty list", { type: "subscribe", symbols: [] }],
  ])("answers %s with BAD_MESSAGE and stays open", async (_, message) => {
    const { socket } = await setup();
    socket.send(message);
    expect((await socket.next("error")).code).toBe("BAD_MESSAGE");
    socket.send({ type: "subscribe", symbols: ["AAPL"] });
    expect((await socket.next("subscribed")).symbols).toEqual(["AAPL"]);
  });

  it("sends heartbeats", async () => {
    const { socket } = await setup({ heartbeatIntervalMs: 30 });
    await socket.next("heartbeat");
  });

  it("keeps each connection's subscriptions separate", async () => {
    const { t, socket: a } = await setup();
    const b = await TestSocket.open(t.wsUrl);
    sockets.push(b);
    a.send({ type: "subscribe", symbols: ["AAPL"] });
    b.send({ type: "subscribe", symbols: ["MSFT"] });
    await a.next("subscribed");
    await b.next("subscribed");
    await new Promise((r) => setTimeout(r, 200));
    const symbols = (s: TestSocket) => new Set(s.messages.flatMap((m) => (m.type === "prices" ? m.ticks.map((x) => x.symbol) : [])));
    expect([...symbols(a)]).toEqual(["AAPL"]);
    expect([...symbols(b)]).toEqual(["MSFT"]);
  });

  it("rejects upgrades on other paths", async () => {
    t = await startTestServer();
    await expect(TestSocket.open(t.wsUrl.replace("/ws", "/other"))).rejects.toThrow();
  });

  describe("simulated drops", () => {
    const drop = (silentDropShare: number) => ({
      latencyMs: { min: 0, max: 0 },
      errorRate: 0,
      socketDropAfterMs: { min: 100, max: 100 },
      silentDropShare,
    });

    it("closes the socket abruptly", async () => {
      const { socket } = await setup({ chaos: drop(0) });
      expect(await socket.closed).toBe(1006); // abnormal closure, like a lost network
    });

    it("can go silent instead: open socket, no more messages or heartbeats", async () => {
      const { t, socket } = await setup({ chaos: drop(1), heartbeatIntervalMs: 30 });
      socket.send({ type: "subscribe", symbols: ["AAPL", "MSFT", "NVDA"] });
      await socket.next("heartbeat");
      await new Promise((r) => setTimeout(r, 150)); // past the drop
      const from = socket.messages.length;
      await new Promise((r) => setTimeout(r, 200));
      expect(socket.messages.slice(from)).toEqual([]);
      expect(socket.ws.readyState).toBe(socket.ws.OPEN);
      expect(t.server.stream.connectionCount).toBe(1);
    });
  });
});
