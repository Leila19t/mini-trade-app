import { WS_PATH } from "@mini-trade/contracts";
import { connectionChanged } from "./connectionSlice";
import { PriceSocket } from "./PriceSocket";
import { pricesReceived } from "./pricesSlice";
import { store } from "./store";

/** Same origin as the page: Vite proxies /ws in dev; the Node server serves both in production. */
const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${WS_PATH}`;

/** The app's one socket. It feeds Redux; components reach it through hooks (useLivePrice). */
export const priceSocket = new PriceSocket({
  url,
  onPrices: (ticks) => store.dispatch(pricesReceived(ticks)),
  onStatus: (state) => store.dispatch(connectionChanged(state)),
});
