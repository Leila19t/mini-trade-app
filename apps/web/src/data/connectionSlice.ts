import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ConnectionState } from "./PriceSocket";
import { pricesReceived } from "./pricesSlice";

export interface ConnectionSliceState extends ConnectionState {
  /** Timestamp of the newest tick received (epoch ms), for "last updated 12 seconds ago". */
  lastTickAt: number | null;
}

const initialState: ConnectionSliceState = { status: "connecting", retryAt: null, lastTickAt: null };

export const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    connectionChanged: (state, action: PayloadAction<ConnectionState>) => ({
      ...action.payload,
      lastTickAt: state.lastTickAt,
    }),
  },
  extraReducers: (builder) => {
    builder.addCase(pricesReceived, (state, action) => {
      for (const tick of action.payload) {
        if (state.lastTickAt === null || tick.timestamp > state.lastTickAt) state.lastTickAt = tick.timestamp;
      }
    });
  },
});

export const { connectionChanged } = connectionSlice.actions;
