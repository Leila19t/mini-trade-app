import type { StockSummary, Ticker } from "@mini-trade/contracts";
import alertCircle from "../assets/icons/alert-circle.svg";
import search from "../assets/icons/search.svg";
import starOutline from "../assets/icons/star-outline.svg";
import { Button } from "../components/Button";
import { EmptyState } from "../components/feedback/EmptyState";
import type { ListTab, SortKey } from "../helpers/types";
import { matchesSearch } from "../helpers/utils";
import { useSortedStocks } from "../hooks/useSortedStocks";
import { StockList } from "./StockList";

interface MarketsListProps {
  panelId: string;
  tab: ListTab;
  query: string;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  stale: boolean;
  /** Undefined while loading. */
  stocks: readonly StockSummary[] | undefined;
  stocksError: boolean;
  onRetryStocks: () => void;
  watchlist: readonly Ticker[] | undefined;
  watchlistError: boolean;
  onRetryWatchlist: () => void;
  onBrowseAll: () => void;
  onClearSearch: () => void;
}

const EMPTY: StockSummary[] = [];

export function MarketsList(props: MarketsListProps) {
  const { panelId, tab, query, sort, onSortChange, stale, stocks, watchlist } =
    props;

  const onWatchlistTab = tab === "watchlist";
  const ready =
    stocks !== undefined && (!onWatchlistTab || watchlist !== undefined);

  const visible = (stocks ?? EMPTY).filter(
    (stock) =>
      matchesSearch(stock, query) &&
      (!onWatchlistTab || watchlist?.includes(stock.symbol)),
  );
  const sorted = useSortedStocks(visible, sort);

  if (props.stocksError && !stocks) {
    return (
      <EmptyState
        icon={alertCircle}
        title="Couldn't load stocks"
        action={
          <Button variant="secondary" onClick={props.onRetryStocks}>
            Try again
          </Button>
        }
      >
        The server didn't answer. Check your connection and try again.
      </EmptyState>
    );
  }

  if (onWatchlistTab && props.watchlistError && !watchlist) {
    return (
      <EmptyState
        icon={alertCircle}
        title="Couldn't load your watchlist"
        action={
          <Button variant="secondary" onClick={props.onRetryWatchlist}>
            Try again
          </Button>
        }
      >
        Your starred stocks are safe. Try again in a moment.
      </EmptyState>
    );
  }

  if (ready && onWatchlistTab && watchlist?.length === 0) {
    return (
      <EmptyState
        icon={starOutline}
        iconTone="star"
        title="Your watchlist is empty"
        action={<Button onClick={props.onBrowseAll}>Browse all stocks</Button>}
      >
        Tap the ☆ next to any stock to keep an eye on it here. Watched prices
        update live, just like the main list.
      </EmptyState>
    );
  }

  if (ready && sorted.length === 0) {
    return (
      <EmptyState
        icon={search}
        title={`No stocks match “${query.trim()}”`}
        action={
          <Button variant="secondary" onClick={props.onClearSearch}>
            Clear search
          </Button>
        }
      >
        Try a company name like “Apple” or a symbol like “AAPL”.
      </EmptyState>
    );
  }

  return (
    <StockList
      id={panelId}
      stocks={ready ? sorted : undefined}
      sort={sort}
      onSortChange={onSortChange}
      stale={stale}
      label={onWatchlistTab ? "Watchlist" : "All stocks"}
    />
  );
}
