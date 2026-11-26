import { QueryClient } from "@tanstack/react-query";
import { HttpError } from "./http";

/** Worth retrying: the server is briefly down (503) or unreachable. 400/404 won't change. */
function isTransient(error: Error) {
  return error instanceof HttpError && (error.code === "UNAVAILABLE" || error.code === "NETWORK");
}

const MAX_RETRIES = 3;

/** TanStack Query holds server state: stock list, stock detail, history, watchlist. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => isTransient(error) && failureCount < MAX_RETRIES,
    },
    mutations: {
      // Watchlist changes are optimistic: on failure we roll back and tell the user, not retry silently.
      retry: false,
    },
  },
});
