import type { HistoryPoint, Range } from "@mini-trade/contracts";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  chartGeometry,
  formatAxisDate,
  formatGridPrice,
  formatTooltipDate,
  nearestIndex,
  xLabelIndices,
} from "../../helpers/chart";
import type { Direction } from "../../helpers/types";
import { formatPrice } from "../../helpers/utils";
import { useElementWidth } from "../../hooks/useElementWidth";

/** Below this width the chart drops the y-axis and gets shorter (Figma "Mobile · Detail"). */
const COMPACT_WIDTH = 520;
/** Room for the y-axis labels on the right (1080 − 1024 in Figma). */
const Y_AXIS_WIDTH = 56;
/** Space under the plot for the date labels. */
const X_AXIS_HEIGHT = 24;

const colors: Record<Direction, { line: string; area: string; dot: string }> = {
  up: { line: "stroke-price-up", area: "fill-price-up-subtle", dot: "fill-price-up" },
  down: { line: "stroke-price-down", area: "fill-price-down-subtle", dot: "fill-price-down" },
  flat: { line: "stroke-text-muted", area: "fill-bg-subtle", dot: "fill-text-muted" },
};

interface PriceChartProps {
  points: readonly HistoryPoint[];
  range: Range;
  /** Line colour follows the range's direction. */
  direction: Direction;
  /** Accessible name, e.g. "NVDA price, past month". */
  label: string;
}

/**
 * Line chart for one range. Hover (or drag on touch) shows a crosshair and a
 * tooltip; arrow keys move it for keyboard users. The last point is the live
 * price, marked with a dot.
 */
export function PriceChart({ points, range, direction, label }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  const compact = width > 0 && width < COMPACT_WIDTH;
  const plotWidth = Math.max(0, width - (compact ? 0 : Y_AXIS_WIDTH));
  const plotHeight = compact ? 176 : 276;
  const plot = { width: plotWidth, height: plotHeight };
  const geometry = useMemo(
    () => chartGeometry(points, { width: plotWidth, height: plotHeight }),
    [points, plotWidth, plotHeight],
  );
  const color = colors[direction];

  const activeIndex = active === null ? null : Math.min(active, points.length - 1);
  const activeCoord = activeIndex === null ? undefined : geometry.coords[activeIndex];
  const lastCoord = geometry.coords[geometry.coords.length - 1];

  const pointAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(event.clientX - rect.left, points.length, plot.width));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const current = activeIndex ?? last;
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, current - step),
      ArrowRight: Math.min(last, current + step),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] ?? null);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  // Keep the tooltip on screen: flip it to the left of the crosshair near the right edge.
  const tooltipOnLeft = activeCoord !== undefined && activeCoord.x > plot.width * 0.7;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use the arrow keys to read prices.`}
      onPointerDown={pointAt}
      onPointerMove={pointAt}
      onPointerLeave={() => setActive(null)}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      className="relative w-full touch-pan-y rounded-sm select-none"
      style={{ height: plot.height + X_AXIS_HEIGHT }}
    >
      {width > 0 && (
        <>
          <svg aria-hidden width={width} height={plot.height} className="absolute top-0 left-0 overflow-visible">
            {geometry.gridPrices.map((_, i) => {
              const y = Math.round((i / (geometry.gridPrices.length - 1)) * plot.height) - 0.5;
              return <line key={i} x1={0} x2={plot.width} y1={y} y2={y} className="stroke-border-default" />;
            })}
            <path d={geometry.area} className={color.area} />
            <path
              d={geometry.line}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={color.line}
            />
            {lastCoord && <circle cx={lastCoord.x} cy={lastCoord.y} r={4} className={color.dot} />}
            {activeCoord && (
              <>
                <line
                  x1={activeCoord.x}
                  x2={activeCoord.x}
                  y1={0}
                  y2={plot.height}
                  className="stroke-text-muted"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r={4}
                  strokeWidth={2}
                  className={`fill-bg-surface ${color.line}`}
                />
              </>
            )}
          </svg>

          {/* y-axis: price at each grid line. */}
          {!compact &&
            geometry.gridPrices.map((price, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute text-[11px] leading-[normal] text-text-muted tabular-nums"
                style={{ left: plot.width + 10, top: (i / (geometry.gridPrices.length - 1)) * plot.height - 7 }}
              >
                {formatGridPrice(price, geometry.gridPrices)}
              </span>
            ))}

          {/* x-axis: dates, first left-aligned, last right-aligned. */}
          {xLabelIndices(points.length, compact ? 3 : 5).map((index, i, all) => {
            const coord = geometry.coords[index];
            if (!coord) return null;
            const align = i === 0 ? "" : i === all.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
            return (
              <span
                key={index}
                aria-hidden
                className={`absolute text-[11px] leading-[normal] whitespace-nowrap text-text-muted ${align}`}
                style={{ left: coord.x, top: plot.height + 8 }}
              >
                {formatAxisDate(coord.point.timestamp, range)}
              </span>
            );
          })}

          {activeCoord && (
            <div
              aria-hidden
              className={`pointer-events-none absolute flex animate-fade-in flex-col gap-0.5 rounded-lg bg-inverse-surface px-2.5 py-2 leading-[normal] whitespace-nowrap motion-reduce:animate-none ${
                tooltipOnLeft ? "-translate-x-full" : ""
              }`}
              style={{
                left: activeCoord.x + (tooltipOnLeft ? -12 : 12),
                top: Math.max(0, Math.min(plot.height - 48, activeCoord.y - 60)),
              }}
            >
              <span className="text-[11px] font-medium text-inverse-text-muted">
                {formatTooltipDate(activeCoord.point.timestamp, range)}
              </span>
              <span className="text-sm font-semibold text-inverse-text tabular-nums">
                {formatPrice(activeCoord.point.price)}
              </span>
            </div>
          )}
        </>
      )}

      {/* What the crosshair shows, for screen readers. */}
      <p className="sr-only" aria-live="polite">
        {activeCoord
          ? `${formatTooltipDate(activeCoord.point.timestamp, range)}: ${formatPrice(activeCoord.point.price)}`
          : ""}
      </p>
    </div>
  );
}
