import type { Ticker } from "@mini-trade/contracts";
import { useEffect } from "react";
import { priceSocket } from "../data/socket";
import { selectPrice, useAppSelector } from "../data/store";

/**
 * Subscribes to one symbol's live price and returns its latest tick, or
 * `undefined` until the first one arrives (fall back to the REST price).
 * Many rows can call this at once: the socket ref-counts and batches subscriptions.
 */
export function useLivePrice(symbol: Ticker) {
  useEffect(() => priceSocket.subscribe([symbol]), [symbol]);
  return useAppSelector((state) => selectPrice(state, symbol));
}
