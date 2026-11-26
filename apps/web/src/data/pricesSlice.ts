import type { PriceTick, Ticker } from "@mini-trade/contracts";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Latest live price per symbol, straight from the socket. Server data (names, stats) lives in TanStack Query. */
export type PricesState = Partial<Record<Ticker, PriceTick>>;

const initialState: PricesState = {};

export const pricesSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {
    /** One socket batch → one state update. Out-of-order (older) ticks are ignored. */
    pricesReceived(state, action: PayloadAction<PriceTick[]>) {
      for (const tick of action.payload) {
        const current = state[tick.symbol];
        if (!current || tick.timestamp >= current.timestamp) state[tick.symbol] = tick;
      }
    },
  },
});

export const { pricesReceived } = pricesSlice.actions;
