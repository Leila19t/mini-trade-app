import type { Ticker, Watchlist } from "@mini-trade/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../data/http";
import { queryKeys } from "../helpers/constants";
import { showToast } from "./useToasts";

interface ToggleVariables {
  symbol: Ticker;
  starred: boolean;
}

const mutationKey = ["watchlist", "toggle"];

/**
 * Star / unstar a stock, optimistically: the star flips at once and rolls back
 * if the server says no, with a toast offering Retry. Toggles run one at a time,
 * in order, and each response is the whole watchlist, so the last one is stored
 * as is: no refetch unless something failed. Callbacks live on the
 * mutation (not on `mutate`), so they still run when the row that started it
 * has already left the screen.
 */
export function useToggleWatchlist() {
  const queryClient = useQueryClient();
  const key = queryKeys.watchlist();

  const mutation = useMutation({
    mutationKey,
    // One at a time, in order: the last response is then the server's final state.
    scope: { id: "watchlist" },
    mutationFn: ({ symbol, starred }: ToggleVariables) =>
      request(starred ? "addToWatchlist" : "removeFromWatchlist", [symbol]),

    onMutate: async ({ symbol, starred }) => {
      // Stop an in-flight fetch from overwriting the optimistic list.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Watchlist>(key);
      queryClient.setQueryData<Watchlist>(key, (current) => {
        const others = (current?.symbols ?? []).filter((s) => s !== symbol);
        return { symbols: starred ? [symbol, ...others] : others };
      });
      return { previous };
    },

    onError: (_error, variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      const verb = variables.starred ? "add" : "remove";
      const preposition = variables.starred ? "to" : "from";
      showToast(`Couldn't ${verb} ${variables.symbol} ${preposition} your watchlist.`, {
        label: "Retry",
        onAction: () => mutation.mutate(variables),
      });
    },

    onSuccess: (watchlist) => {
      // Only the last of several quick toggles: an earlier response would undo a later optimistic change.
      if (queryClient.isMutating({ mutationKey }) === 1) queryClient.setQueryData(key, watchlist);
    },

    onSettled: (_data, error) => {
      // After a failure the rollback may be out of date (other toggles were queued): ask the server.
      if (error && queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  return mutation;
}
