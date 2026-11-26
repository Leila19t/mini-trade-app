import type { Ticker } from "@mini-trade/contracts";
import { useMemo, useState, type ReactNode } from "react";
import maximize from "../assets/icons/maximize.svg";
import minimize from "../assets/icons/minimize.svg";
import { CandleChart } from "../components/chart/CandleChart";
import { CandleLegend } from "../components/chart/CandleLegend";
import { ChartCard } from "../components/chart/ChartCard";
import { ChartError } from "../components/chart/ChartError";
import { ChartIconButton } from "../components/chart/ChartIconButton";
import { ChartLoading } from "../components/chart/ChartLoading";
import { IntervalTabs } from "../components/chart/IntervalTabs";
import { formatCandleTime, withLivePrice } from "../helpers/candles";
import { formatCompactNumber, formatPrice } from "../helpers/utils";
import { useCandleInterval } from "../hooks/useCandleInterval";
import { useCandles } from "../hooks/useCandles";
import { useFullscreen } from "../hooks/useFullscreen";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
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
 * The whole card can go fullscreen (button or F; Esc leaves).
 */
export function ProChartPanel({ symbol, modeToggle }: ProChartPanelProps) {
  const { interval, setInterval } = useCandleInterval();
  const query = useCandles(symbol, interval);
  const live = useLivePrice(symbol);
  const [hovered, setHovered] = useState<number | null>(null);
  const { ref: cardRef, isFullscreen, toggle: toggleFullscreen, supported: canFullscreen } = useFullscreen<HTMLElement>();
  useKeyboardShortcut("f", toggleFullscreen);

  const shownInterval = query.data?.interval ?? interval;
  const candles = useMemo(
    () => (query.data ? withLivePrice(query.data.candles, live, shownInterval) : undefined),
    [query.data, live, shownInterval],
  );
  const hoveredCandle = hovered === null ? undefined : candles?.[hovered];
  const legendCandle = hoveredCandle ?? candles?.at(-1);
  const loadingNewInterval = query.isPlaceholderData;

  return (
    <ChartCard ref={cardRef} loading={loadingNewInterval} fullscreen={isFullscreen}>
      <div className="flex items-center gap-4">
        <IntervalTabs value={interval} onChange={setInterval} />
        <span className="flex-1" />
        {canFullscreen && (
          <ChartIconButton
            icon={isFullscreen ? minimize : maximize}
            label={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            aria-keyshortcuts="F"
            onClick={toggleFullscreen}
          />
        )}
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

      <div
        className={`relative transition-opacity duration-200 ${loadingNewInterval ? "opacity-50" : ""} ${
          isFullscreen ? "min-h-0 flex-1" : ""
        }`}
      >
        {candles ? (
          <CandleChart
            // A new stock starts on its latest candles, not wherever the last one was scrolled to.
            key={symbol}
            fill={isFullscreen}
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
