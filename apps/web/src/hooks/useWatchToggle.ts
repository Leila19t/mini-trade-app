import type { Ticker } from "@mini-trade/contracts";
import { showToast } from "./useToasts";
import { useToggleWatchlist } from "./useToggleWatchlist";
import { useWatchlist } from "./useWatchlist";

/**
 * Everything a star or watch button needs for one stock. Unstarring shows an
 * Undo toast right away (no confirm dialog), since the row may vanish from the
 * Watchlist tab.
 */
export function useWatchToggle(symbol: Ticker) {
  const watchlist = useWatchlist();
  const { mutate } = useToggleWatchlist();
  const starred = watchlist.data?.includes(symbol) ?? false;

  const toggle = () => {
    const next = !starred;
    mutate({ symbol, starred: next });
    if (!next) {
      showToast(`Removed ${symbol} from your watchlist.`, {
        label: "Undo",
        onAction: () => mutate({ symbol, starred: true }),
      });
    }
  };

  return {
    starred,
    toggle,
    /** False until the watchlist has loaded: the star can't know its state yet. */
    ready: watchlist.isSuccess,
  };
}
