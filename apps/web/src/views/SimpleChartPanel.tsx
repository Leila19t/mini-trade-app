import type { HistoryPoint, Ticker } from "@mini-trade/contracts";
import { useMemo, type ReactNode } from "react";
import { ChartCard } from "../components/chart/ChartCard";
import { ChartError } from "../components/chart/ChartError";
import { ChartLoading } from "../components/chart/ChartLoading";
import { PriceChart } from "../components/chart/PriceChart";
import { RangeTabs } from "../components/chart/RangeTabs";
import { RANGE_LABELS } from "../helpers/constants";
import { changeBetween, directionText, formatSignedPercent, formatSignedPrice } from "../helpers/utils";
import { useHistory } from "../hooks/useHistory";
import { useLivePrice } from "../hooks/useLivePrice";
import { useRange } from "../hooks/useRange";

interface SimpleChartPanelProps {
  symbol: Ticker;
  /** Simple / Pro switch for the header; absent on phones. */
  modeToggle?: ReactNode;
}

/**
 * Simple chart: range tabs, the change over the selected range, and the area
 * chart. The range is in the URL. While a new range loads, the previous chart
 * stays dimmed under a progress bar; if it fails, the error stays inside the card.
 */
export function SimpleChartPanel({ symbol, modeToggle }: SimpleChartPanelProps) {
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
    <ChartCard loading={loadingNewRange}>
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
        {modeToggle}
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
          <ChartError title={`Couldn't load the ${range} chart`} onRetry={() => void history.refetch()} />
        ) : (
          <ChartLoading />
        )}
      </div>

      {/* Phones: range tabs under the chart, close to the thumb. */}
      <div className="sm:hidden">
        <RangeTabs value={range} onChange={setRange} fullWidth />
      </div>
    </ChartCard>
  );
}
