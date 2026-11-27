import { z } from "zod";
import { Price, Ticker, Timestamp } from "./primitives";


export const WS_PATH = "/ws";


export const PriceTick = z.object({
  symbol: Ticker,
  price: Price,
  timestamp: Timestamp,
});
export type PriceTick = z.infer<typeof PriceTick>;

// ---------------------------------------------------------------------------
// Client → server
// ---------------------------------------------------------------------------

/** Start receiving prices for these symbols. */
export const SubscribeMessage = z.object({
  type: z.literal("subscribe"),
  symbols: z.array(Ticker).min(1),
});

/** Stop receiving prices for these symbols. */
export const UnsubscribeMessage = z.object({
  type: z.literal("unsubscribe"),
  symbols: z.array(Ticker).min(1),
});

export const ClientMessage = z.discriminatedUnion("type", [
  SubscribeMessage,
  UnsubscribeMessage,
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

// ---------------------------------------------------------------------------
// Server → client
// ---------------------------------------------------------------------------

/** Sent once on connect. */
export const WelcomeMessage = z.object({
  type: z.literal("welcome"),
  serverTime: Timestamp,
  heartbeatIntervalMs: z.number().int().positive(),
});

/**
 * Price updates, batched: the server flushes every changed price on a short
 * interval instead of one message per tick, so the client can apply a whole
 * batch in a single state update.
 */
export const PricesMessage = z.object({
  type: z.literal("prices"),
  ticks: z.array(PriceTick).min(1),
});

/** Confirms the full set of symbols this connection is now subscribed to. */
export const SubscribedMessage = z.object({
  type: z.literal("subscribed"),
  symbols: z.array(Ticker),
});

export const HeartbeatMessage = z.object({
  type: z.literal("heartbeat"),
  serverTime: Timestamp,
});

export const SocketErrorCode = z.enum(["BAD_MESSAGE", "UNKNOWN_SYMBOL"]);
export type SocketErrorCode = z.infer<typeof SocketErrorCode>;

export const SocketErrorMessage = z.object({
  type: z.literal("error"),
  code: SocketErrorCode,
  message: z.string(),
});

export const ServerMessage = z.discriminatedUnion("type", [
  WelcomeMessage,
  PricesMessage,
  SubscribedMessage,
  HeartbeatMessage,
  SocketErrorMessage,
]);
export type ServerMessage = z.infer<typeof ServerMessage>;
