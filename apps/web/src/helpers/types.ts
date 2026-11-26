/**
 * UI-only types. Anything that comes from the server (Stock, PriceTick, Watchlist...)
 * is imported from @mini-trade/contracts, never redeclared here.
 */

/** The theme on screen. */
export type Theme = "light" | "dark";

/** What the user chose; "system" follows the OS setting. */
export type ThemePreference = Theme | "system";

/** Which way a price moved. "flat" when it didn't. */
export type Direction = "up" | "down" | "flat";

/** The tabs above the stock list. */
export type ListTab = "all" | "watchlist";

/** How the stock list is ordered. Price and change sorts use live prices. */
export type SortKey = "name" | "price-desc" | "price-asc" | "change-desc" | "change-asc";
