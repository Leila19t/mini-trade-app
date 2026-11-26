import type { HistoryPoint, Range } from "@mini-trade/contracts";
import { formatPrice, formatWholePrice } from "./utils";

/**
 * Pure chart maths for the price chart: scales, SVG paths, axis labels.
 * No React, no DOM, so it can be unit tested on its own.
 */

/** Horizontal grid lines (and y labels), evenly spaced like the Figma chart. */
export const GRID_LINES = 5;
/** x-axis date labels. */
export const X_LABELS = 5;

export interface Plot {
  /** Plot area size in px (excluding the axis labels). */
  width: number;
  height: number;
}

export interface Coord {
  x: number;
  y: number;
  point: HistoryPoint;
}

export interface ChartGeometry {
  coords: Coord[];
  /** SVG path for the price line. */
  line: string;
  /** SVG path for the filled area under the line. */
  area: string;
  /** Prices at each grid line, top to bottom. */
  gridPrices: number[];
}

/** Min/max price with a little headroom, so the line never touches the edges. */
function domain(points: readonly HistoryPoint[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const { price } of points) {
    min = Math.min(min, price);
    max = Math.max(max, price);
  }
  const span = max - min || max * 0.01 || 1; // a flat line still gets a visible band
  const pad = span * 0.08;
  return [min - pad, max + pad];
}

/** Maps points onto a plot. Points are evenly spaced in time, so x is by index. */
export function chartGeometry(points: readonly HistoryPoint[], plot: Plot): ChartGeometry {
  const [low, high] = domain(points);
  const lastIndex = Math.max(1, points.length - 1);
  const yOf = (price: number) => plot.height - ((price - low) / (high - low)) * plot.height;

  const coords = points.map((point, index) => ({
    x: (index / lastIndex) * plot.width,
    y: yOf(point.price),
    point,
  }));

  const line = coords.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = first && last ? `${line}L${last.x.toFixed(1)},${plot.height}L${first.x.toFixed(1)},${plot.height}Z` : "";

  const gridPrices = Array.from(
    { length: GRID_LINES },
    (_, i) => high - (i / (GRID_LINES - 1)) * (high - low),
  );

  return { coords, line, area, gridPrices };
}

/** Grid labels show whole dollars unless lines are closer than $2 apart (then cents). */
export function formatGridPrice(price: number, gridPrices: readonly number[]): string {
  const step = gridPrices.length > 1 ? Math.abs((gridPrices[0] ?? 0) - (gridPrices[1] ?? 0)) : 0;
  return step >= 2 ? formatWholePrice(price) : formatPrice(price);
}

/** Index of the point closest to `x` (px from the plot's left edge). */
export function nearestIndex(x: number, count: number, width: number): number {
  if (count <= 1 || width <= 0) return 0;
  const index = Math.round((x / width) * (count - 1));
  return Math.min(count - 1, Math.max(0, index));
}

/** Indices of the points that get an x-axis label, evenly spread from first to last. */
export function xLabelIndices(count: number, wanted = X_LABELS): number[] {
  if (count <= 1) return [0];
  const labels = Math.max(2, Math.min(wanted, count));
  return Array.from({ length: labels }, (_, i) => Math.round((i / (labels - 1)) * (count - 1)));
}

const axisFormats: Record<Range, Intl.DateTimeFormat> = {
  "1D": new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }),
  "1W": new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }),
  "1M": new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }),
  "3M": new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }),
  "1Y": new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }),
  "5Y": new Intl.DateTimeFormat("en-US", { year: "numeric" }),
};

const withTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const withYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** x-axis label: "2:00 PM" on 1D, "Nov 8" on months, "2023" on 5Y. */
export function formatAxisDate(timestamp: number, range: Range): string {
  return axisFormats[range].format(timestamp);
}

/** Tooltip date: with the time on short ranges, with the year on long ones. */
export function formatTooltipDate(timestamp: number, range: Range): string {
  return range === "1D" || range === "1W" ? withTime.format(timestamp) : withYear.format(timestamp);
}
