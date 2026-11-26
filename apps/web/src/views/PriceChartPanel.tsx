import type { HistoryPoint, Ticker } from "@mini-trade/contracts";
import { useMemo } from "react";
import alertCircle from "../assets/icons/alert-circle.svg";
import { Button } from "../components/Button";
import { CHART_HEIGHT, EmptyGrid } from "../components/chart/EmptyGrid";
import { PriceChart } from "../components/chart/PriceChart";
import { RangeTabs } from "../components/chart/RangeTabs";
import { RANGE_LABELS } from "../helpers/constants";
import { changeBetween, directionText, formatSignedPercent, formatSignedPrice } from "../helpers/utils";
import { useHistory } from "../hooks/useHistory";
import { useLivePrice } from "../hooks/useLivePrice";
import { useRange } from "../hooks/useRange";

interface PriceChartPanelProps {
  symbol: Ticker;
}

/**
 * Chart card: range tabs, the change over the selected range, and the chart.
 * The range is in the URL. While a new range loads, the previous chart stays
 * dimmed under a progress bar; if it fails, the error stays inside this card.
 */
export function PriceChartPanel({ symbol }: PriceChartPanelProps) {
  const { range, setRange } = useRange();
  const history = useHistory(symbol, range);
  const live = useLivePrice(symbol);

  // The chart always ends at the live price (the server's last point is the price when it answered).
  const points = useMemo<HistoryPoint[] | undefined>(() => {
    const data = history.data?.points;
    if (!data) return undefined;
    const last = data[data.length - 1];
    if (!live || !last || live.timestamp < last.timestamp) return data;
    return [...data.slice(0, -1), { timestamp: live.timestamp, price: live.price }];
  }, [history.data, live]);

  const shownRange = history.data?.range ?? range;
  const first = points?.[0];
  const last = points?.[points.length - 1];
  const change = first && last ? changeBetween(last.price, first.price) : undefined;
  const loadingNewRange = history.isPlaceholderData;

  return (
    <section
      aria-label="Price chart"
      className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 max-sm:gap-3.5 max-sm:overflow-visible max-sm:rounded-none max-sm:border-0 max-sm:p-0"
    >
      {loadingNewRange && (
        <div
          role="progressbar"
          aria-label="Loading chart"
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden max-sm:-top-2"
        >
          <span className="block h-full w-2/5 animate-progress bg-brand-primary motion-reduce:animate-none" />
        </div>
      )}

      <div className="flex items-center gap-4 max-sm:hidden">
        <RangeTabs value={range} onChange={setRange} />
        <span className="flex-1" />
        {change && (
          <p className="flex items-center gap-2 leading-[normal] whitespace-nowrap">
            <span className="text-[13px] text-text-muted">{RANGE_LABELS[shownRange]}</span>
            <span className={`text-sm font-semibold tabular-nums ${directionText[change.direction]}`}>
              {formatSignedPrice(change.amount)} ({formatSignedPercent(change.fraction)})
            </span>
          </p>
        )}
      </div>

      <div className={`relative transition-opacity duration-200 ${loadingNewRange ? "opacity-50" : ""}`}>
        {points && change ? (
          <PriceChart
            points={points}
            range={shownRange}
            direction={change.direction}
            label={`${symbol} price, ${RANGE_LABELS[shownRange].toLowerCase()}`}
          />
        ) : history.isError ? (
          <div className={`relative ${CHART_HEIGHT}`}>
            <EmptyGrid />
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-6 text-center"
            >
              <img src={alertCircle} alt="" width={32} height={32} />
              <p className="text-base leading-[normal] font-semibold text-text-primary">
                Couldn't load the {range} chart
              </p>
              <p className="text-sm leading-[normal] text-text-muted">The live price above is still updating.</p>
              <Button variant="secondary" onClick={() => void history.refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <div aria-busy className={`relative ${CHART_HEIGHT}`}>
            <EmptyGrid />
            <span className="sr-only">Loading chart</span>
            <div className="absolute inset-x-0 bottom-6 h-1/2 animate-pulse rounded-lg bg-bg-subtle motion-reduce:animate-none" />
          </div>
        )}
      </div>

      {/* Phones: range tabs under the chart, close to the thumb. */}
      <div className="sm:hidden">
        <RangeTabs value={range} onChange={setRange} fullWidth />
      </div>
    </section>
  );
}
