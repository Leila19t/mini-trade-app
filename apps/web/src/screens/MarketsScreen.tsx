import { useId } from "react";
import { ListTabs } from "../components/markets/ListTabs";
import { SearchField } from "../components/navigation/SearchField";
import { useConnectionStatus } from "../hooks/useConnectionStatus";
import { useMarketsParams } from "../hooks/useMarketsParams";
import { useSearchQuery } from "../hooks/useSearchQuery";
import { useStocks } from "../hooks/useStocks";
import { useWatchlist } from "../hooks/useWatchlist";
import { ConnectionBanner } from "../views/ConnectionBanner";
import { MarketsHeader } from "../views/MarketsHeader";
import { MarketsList } from "../views/MarketsList";

/**
 * Home screen: every stock with its live price, plus the user's watchlist.
 */
export function MarketsScreen() {
  const panelId = useId();
  const { search, tab, sort, setTab, setSort } = useMarketsParams();
  const { setQuery } = useSearchQuery();
  const stocks = useStocks();
  const watchlist = useWatchlist();
  const { status, lastTickAt } = useConnectionStatus();

  // Only count starred symbols that are actually in the stock list.
  const watchedCount =
    stocks.data &&
    watchlist.data?.filter((symbol) =>
      stocks.data.some((s) => s.symbol === symbol),
    ).length;

  return (
    <main className="mx-auto flex max-w-page flex-col gap-5 px-6 pt-8 pb-12 max-sm:gap-3 max-sm:px-4 max-sm:pt-4">
      <MarketsHeader sort={sort} onSortChange={setSort} />
      <div className="sm:hidden">
        <SearchField variant="inline" />
      </div>
      <ListTabs
        selected={tab}
        counts={{ all: stocks.data?.length, watchlist: watchedCount }}
        onSelect={setTab}
        controls={panelId}
      />
      <ConnectionBanner />
      <MarketsList
        panelId={panelId}
        tab={tab}
        query={search}
        sort={sort}
        onSortChange={setSort}
        stale={status !== "live" && lastTickAt !== null}
        stocks={stocks.data}
        stocksError={stocks.isError}
        onRetryStocks={() => void stocks.refetch()}
        watchlist={watchlist.data}
        watchlistError={watchlist.isError}
        onRetryWatchlist={() => void watchlist.refetch()}
        onBrowseAll={() => setTab("all")}
        onClearSearch={() => setQuery("")}
      />
    </main>
  );
}
