import { priceSocket } from "../data/socket";
import { selectConnection, useAppSelector } from "../data/store";

/** Skips the reconnect countdown. Stable, so it's safe in props and effects. */
const retryNow = () => priceSocket.retryNow();

/**
 * The socket's status ("connecting" | "live" | "reconnecting" | "offline"), when it
 * retries next (`retryAt`), when the last price arrived (`lastTickAt`), and `retryNow()`.
 */
export function useConnectionStatus() {
  return { ...useAppSelector(selectConnection), retryNow };
}
