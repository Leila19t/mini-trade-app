import type { Ticker } from "@mini-trade/contracts";
import { configureStore } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import { connectionSlice } from "./connectionSlice";
import { pricesSlice } from "./pricesSlice";

/** Redux holds client state that changes often: live prices and the socket's status. */
export const store = configureStore({
  reducer: {
    prices: pricesSlice.reducer,
    connection: connectionSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = useSelector.withTypes<RootState>();

/*
 * Selectors. A plain lookup is already memoised per symbol: Immer keeps an
 * untouched tick's object identity, so a batch re-renders only the rows whose
 * symbol actually changed.
 */
export const selectPrice = (state: RootState, symbol: Ticker) => state.prices[symbol];
export const selectConnection = (state: RootState) => state.connection;
