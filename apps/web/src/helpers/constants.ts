import type { CandleInterval, Range, Ticker } from "@mini-trade/contracts";
import type { ListTab, SortKey } from "./types";

/**
 * App-wide constants (timings, limits, query keys...).
 * API paths, ranges and the WebSocket path come from @mini-trade/contracts; don't redeclare them here.
 */

/** Query-string keys. Search, tab, sort and chart range live in the URL so they're shareable. */
export const params = {
  search: "q",
  tab: "tab",
  sort: "sort",
  range: "range",
  mode: "mode",
  interval: "interval",
} as const;

/** Builds in-app URLs, so links never hand-write paths. */
export const paths = {
  markets: (query?: { search?: string }) => {
    const search = query?.search ? `?${new URLSearchParams({ [params.search]: query.search })}` : "";
    return `/${search}`;
  },
  stock: (symbol: Ticker) => `/stocks/${encodeURIComponent(symbol)}`,
};

/** localStorage key for the last chart mode (Simple / Pro), used when the URL doesn't say. */
export const CHART_MODE_STORAGE_KEY = "mini-trade:chart-mode";

/** The Pro chart needs room: phones always get the Simple chart. Matches Tailwind's `sm`. */
export const PRO_CHART_MEDIA_QUERY = "(min-width: 640px)";

/** Candles are refetched this often; live ticks move the last one in between. */
export const CANDLES_REFETCH_MS = 60_000;

/** Pro chart zoom: candles shown at first (and after Reset), the closest zoom, and each +/− step. */
export const CANDLE_ZOOM = { initial: 64, min: 12, step: 1.5 } as const;

/** localStorage key for the theme preference. index.html reads it too, before first paint. */
export const THEME_STORAGE_KEY = "mini-trade:theme";

/** TanStack Query keys, built in one place so invalidation always matches. */
export const queryKeys = {
  stocks: () => ["stocks"] as const,
  stock: (symbol: Ticker) => ["stocks", symbol] as const,
  history: (symbol: Ticker, range: Range) => ["stocks", symbol, "history", range] as const,
  candles: (symbol: Ticker, interval: CandleInterval) => ["stocks", symbol, "candles", interval] as const,
  watchlist: () => ["watchlist"] as const,
};

export const LIST_TABS: readonly { value: ListTab; label: string }[] = [
  { value: "all", label: "All stocks" },
  { value: "watchlist", label: "Watchlist" },
];

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "price-desc", label: "Price (high–low)" },
  { value: "price-asc", label: "Price (low–high)" },
  { value: "change-desc", label: "Today (best first)" },
  { value: "change-asc", label: "Today (worst first)" },
];

export const DEFAULT_SORT: SortKey = "name";

/** Shown next to the change over the selected chart range. */
export const RANGE_LABELS: Record<Range, string> = {
  "1D": "Past 24 hours",
  "1W": "Past week",
  "1M": "Past month",
  "3M": "Past 3 months",
  "1Y": "Past year",
  "5Y": "Past 5 years",
};

/** How long a row tints after its price ticks (matches the CSS animation). */
export const PRICE_FLASH_MS = 600;

/** How long a toast stays up, e.g. the watchlist Undo. */
export const TOAST_DURATION_MS = 5_000;

/** Skeleton rows on first load: about one screen's worth. */
export const SKELETON_ROWS = 10;
