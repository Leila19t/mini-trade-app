import type { Ticker } from "@mini-trade/contracts";
import { useMemo, useState, type ReactNode } from "react";
import { CandleChart } from "../components/chart/CandleChart";
import { CandleLegend } from "../components/chart/CandleLegend";
import { ChartCard } from "../components/chart/ChartCard";
import { ChartError } from "../components/chart/ChartError";
import { ChartLoading } from "../components/chart/ChartLoading";
import { IntervalTabs } from "../components/chart/IntervalTabs";
import { formatCandleTime, withLivePrice } from "../helpers/candles";
import { formatCompactNumber, formatPrice } from "../helpers/utils";
import { useCandleInterval } from "../hooks/useCandleInterval";
import { useCandles } from "../hooks/useCandles";
import { useLivePrice } from "../hooks/useLivePrice";

interface ProChartPanelProps {
  symbol: Ticker;
  /** Simple / Pro switch for the header. */
  modeToggle: ReactNode;
}

/**
 * Pro chart (desktop only): interval tabs, the OHLCV legend and candlesticks
 * with volume. The interval is in the URL. The last candle follows live ticks;
 * the legend shows it until the pointer (or keyboard) picks another candle.
 */
export function ProChartPanel({ symbol, modeToggle }: ProChartPanelProps) {
  const { interval, setInterval } = useCandleInterval();
  const query = useCandles(symbol, interval);
  const live = useLivePrice(symbol);
  const [hovered, setHovered] = useState<number | null>(null);

  const shownInterval = query.data?.interval ?? interval;
  const candles = useMemo(
    () => (query.data ? withLivePrice(query.data.candles, live, shownInterval) : undefined),
    [query.data, live, shownInterval],
  );
  const hoveredCandle = hovered === null ? undefined : candles?.[hovered];
  const legendCandle = hoveredCandle ?? candles?.at(-1);
  const loadingNewInterval = query.isPlaceholderData;

  return (
    <ChartCard loading={loadingNewInterval}>
      <div className="flex items-center gap-4">
        <IntervalTabs value={interval} onChange={setInterval} />
        <span className="flex-1" />
        {modeToggle}
      </div>

      {legendCandle ? (
        <CandleLegend symbol={symbol} interval={shownInterval} candle={legendCandle} live={!hoveredCandle} />
      ) : (
        <div aria-hidden className="h-4" />
      )}

      {/* What the crosshair shows, for screen readers. Silent while nothing is hovered, so ticks aren't read out. */}
      <p className="sr-only" aria-live="polite">
        {hoveredCandle &&
          `${formatCandleTime(hoveredCandle.timestamp, shownInterval)}: open ${formatPrice(hoveredCandle.open)}, high ${formatPrice(hoveredCandle.high)}, low ${formatPrice(hoveredCandle.low)}, close ${formatPrice(hoveredCandle.close)}, volume ${formatCompactNumber(hoveredCandle.volume)}`}
      </p>

      <div className={`relative transition-opacity duration-200 ${loadingNewInterval ? "opacity-50" : ""}`}>
        {candles ? (
          <CandleChart
            candles={candles}
            interval={shownInterval}
            label={`${symbol} candles, ${shownInterval}`}
            onHoverChange={setHovered}
          />
        ) : query.isError ? (
          <ChartError title={`Couldn't load the ${interval} candles`} onRetry={() => void query.refetch()} />
        ) : (
          <ChartLoading />
        )}
      </div>
    </ChartCard>
  );
}
