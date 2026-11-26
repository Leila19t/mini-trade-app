import type { StockSummary, Ticker } from "@mini-trade/contracts";
import type { Direction, SortKey } from "./types";

/**
 * Small pure helpers (formatting, maths). Keep them framework-free so they're easy to unit test.
 * Prices are formatted only in the UI, with Intl.NumberFormat.
 */

// ---------------------------------------------------------------------------
// Formatting

const MINUS = "−"; // U+2212: same width as "+", reads as a minus sign, not a hyphen

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const numberCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $231.42 */
export function formatPrice(value: number): string {
  return usd.format(value);
}

/** $120 — for chart axes, where cents are noise. */
export function formatWholePrice(value: number): string {
  return usdWhole.format(value);
}

/** $3.23T */
export function formatCompactPrice(value: number): string {
  return usdCompact.format(value);
}

/** 212.4M */
export function formatCompactNumber(value: number): string {
  return numberCompact.format(value);
}

function sign(value: number): string {
  if (value > 0) return "+";
  if (value < 0) return MINUS;
  return "";
}

/** +$3.18 / −$3.18. Always signed, so the direction never relies on colour. */
export function formatSignedPrice(value: number): string {
  return `${sign(value)}${usd.format(Math.abs(value))}`;
}

/** +2.47% / −1.03%, from a fraction (0.0247). */
export function formatSignedPercent(fraction: number): string {
  return `${sign(fraction)}${percent.format(Math.abs(fraction))}`;
}

// ---------------------------------------------------------------------------
// Price maths

export interface Change {
  /** Difference in dollars. */
  amount: number;
  /** Difference as a fraction of the reference price (0.0247 = +2.47%). */
  fraction: number;
  direction: Direction;
}

/** How far `current` has moved from `reference`. */
export function changeBetween(current: number, reference: number): Change {
  const amount = current - reference;
  const fraction = reference === 0 ? 0 : amount / reference;
  // Compare rounded cents: a float difference of 1e-12 is not a move.
  const cents = Math.round(amount * 100);
  const direction: Direction = cents > 0 ? "up" : cents < 0 ? "down" : "flat";
  return { amount, fraction, direction };
}

/** Text and background classes for a change, shared by every up/down label. */
export const directionText: Record<Direction, string> = {
  up: "text-price-up",
  down: "text-price-down",
  flat: "text-text-muted",
};

export const directionPill: Record<Direction, string> = {
  up: "bg-price-up-subtle text-price-up",
  down: "bg-price-down-subtle text-price-down",
  flat: "bg-bg-subtle text-text-muted",
};

// ---------------------------------------------------------------------------
// Stock list

/** Case-insensitive match on symbol or company name. An empty query matches everything. */
export function matchesSearch(stock: Pick<StockSummary, "symbol" | "name">, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return stock.symbol.toLowerCase().includes(needle) || stock.name.toLowerCase().includes(needle);
}

/**
 * Orders stocks for the list. `livePrice` returns the latest socket price for a
 * symbol (or undefined before the first tick), so price sorts stay current.
 * Ties fall back to the symbol, so the order is stable.
 */
export function sortStocks(
  stocks: readonly StockSummary[],
  sort: SortKey,
  livePrice: (symbol: Ticker) => number | undefined,
): StockSummary[] {
  const price = (stock: StockSummary) => livePrice(stock.symbol) ?? stock.price;
  const change = (stock: StockSummary) => changeBetween(price(stock), stock.price24hAgo).fraction;

  const compare: Record<SortKey, (a: StockSummary, b: StockSummary) => number> = {
    // "Name" is the bold symbol in each row (the Figma list is AAPL, AMZN, GOOGL…), not the company name.
    name: (a, b) => a.symbol.localeCompare(b.symbol),
    "price-desc": (a, b) => price(b) - price(a),
    "price-asc": (a, b) => price(a) - price(b),
    "change-desc": (a, b) => change(b) - change(a),
    "change-asc": (a, b) => change(a) - change(b),
  };

  return [...stocks].sort((a, b) => compare[sort](a, b) || a.symbol.localeCompare(b.symbol));
}

/** The letter shown in a stock's placeholder logo. */
export function logoLetter(symbol: Ticker): string {
  return symbol.charAt(0);
}

// ---------------------------------------------------------------------------
// Time

/** "just now", "12 seconds ago", "3 minutes ago". */
export function formatTimeAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}
