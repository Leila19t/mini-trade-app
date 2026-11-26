import type { Candle, CandleInterval } from "@mini-trade/contracts";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  TickMarkType,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useEffectEvent, useRef, type KeyboardEvent } from "react";
import { candleEnd, formatCandleTime, formatCountdown, toChartTime, withAlpha } from "../../helpers/candles";
import { formatPrice } from "../../helpers/utils";
import { useNow } from "../../hooks/useNow";
import type { Theme } from "../../helpers/types";
import { useTheme } from "../../hooks/useTheme";

/** Volume bars use the candle colours at this opacity (Figma: 35%). */
const VOLUME_ALPHA = 0.35;
/** Price pane margins: the bottom quarter is left to the volume bars. */
const PRICE_MARGINS = { top: 0.08, bottom: 0.26 };
const VOLUME_MARGINS = { top: 0.8, bottom: 0 };

interface ChartColors {
  up: string;
  down: string;
  grid: string;
  text: string;
  label: string;
}

/** The library draws on a canvas, so it gets the design tokens as plain colours. */
function readColors(): ChartColors {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    up: token("--price-up"),
    down: token("--price-down"),
    grid: token("--border-default"),
    text: token("--text-muted"),
    label: token("--inverse-surface"),
  };
}

/** Token colours per theme, read once the theme is applied to <html>. */
const colorsByTheme: Partial<Record<Theme, ChartColors>> = {};
function colorsFor(theme: Theme): ChartColors {
  colorsByTheme[theme] ??= readColors();
  return colorsByTheme[theme];
}

const chartTime = (timestamp: number) => toChartTime(timestamp) as UTCTimestamp;
const isUp = (candle: Candle) => candle.close >= candle.open;

const toBar = (candle: Candle): CandlestickData<Time> => ({
  time: chartTime(candle.timestamp),
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
});

const toVolume = (candle: Candle, colors: ChartColors): HistogramData<Time> => ({
  time: chartTime(candle.timestamp),
  value: candle.volume,
  color: withAlpha(isUp(candle) ? colors.up : colors.down, VOLUME_ALPHA),
});

// Chart times are already shifted to local wall-clock time, so they're formatted as UTC.
const axisFormats = {
  year: new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }),
  day: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
};

function formatTickMark(time: Time, type: TickMarkType): string {
  const ms = (time as number) * 1000;
  if (type === TickMarkType.Year) return axisFormats.year.format(ms);
  if (type === TickMarkType.Month) return axisFormats.month.format(ms);
  if (type === TickMarkType.DayOfMonth) return axisFormats.day.format(ms);
  return axisFormats.time.format(ms);
}

interface ChartApi {
  chart: IChartApi;
  candles: ISeriesApi<"Candlestick">;
  volume: ISeriesApi<"Histogram">;
}

interface CandleChartProps {
  /** Oldest first; the last one is the live candle. */
  candles: readonly Candle[];
  interval: CandleInterval;
  /** Accessible name, e.g. "NVDA candles, 15 minutes". */
  label: string;
  /** Index of the candle under the crosshair, or null when nothing is hovered. */
  onHoverChange: (index: number | null) => void;
}

/**
 * Candlesticks with volume underneath, drawn by TradingView's Lightweight
 * Charts. The last candle is live: the dashed line and the axis tag mark the
 * live price, with a countdown until the candle closes. Hover shows the
 * crosshair; arrow keys step through candles for keyboard users.
 */
export function CandleChart({ candles, interval, label, onHoverChange }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const api = useRef<ChartApi | null>(null);
  /** What's on the chart now, so a live tick only redraws the last candle. */
  const drawn = useRef<{ candles: readonly Candle[]; colors: ChartColors | null }>({ candles: [], colors: null });
  const indexByTime = useRef(new Map<number, number>());
  /** Candle selected with the keyboard. */
  const keyboardIndex = useRef<number | null>(null);

  const { theme } = useTheme();
  const colors = colorsFor(theme);
  const now = useNow(1000);
  const reportHover = useEffectEvent((index: number | null) => onHoverChange(index));

  // Create the chart once; the effects below keep it in sync.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      // A fixed window of recent candles: the wheel and drags keep scrolling the page.
      handleScroll: false,
      handleScale: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        fontSize: 11,
        fontFamily: getComputedStyle(container).fontFamily,
        attributionLogo: true, // Lightweight Charts' licence asks for the TradingView link
      },
      grid: { vertLines: { visible: false } },
      rightPriceScale: { borderVisible: false, scaleMargins: PRICE_MARGINS },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, tickMarkFormatter: formatTickMark },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { style: LineStyle.Solid, width: 1 },
        horzLine: { style: LineStyle.Dashed, width: 1 },
      },
      localization: { locale: "en-US", priceFormatter: formatPrice },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      borderVisible: false,
      priceLineStyle: LineStyle.Dashed,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: VOLUME_MARGINS });

    chart.subscribeCrosshairMove((param) => {
      const index = param.time === undefined ? undefined : indexByTime.current.get(param.time as number);
      reportHover(index ?? null);
    });

    api.current = { chart, candles: candleSeries, volume: volumeSeries };
    drawn.current = { candles: [], colors: null };
    return () => {
      chart.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    const current = api.current;
    if (!current) return;
    const crosshairLine = { color: colors.text, labelBackgroundColor: colors.label };
    current.chart.applyOptions({
      layout: { textColor: colors.text },
      grid: { horzLines: { color: colors.grid } },
      crosshair: { vertLine: crosshairLine, horzLine: crosshairLine },
    });
    current.candles.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    });
  }, [colors]);

  useEffect(() => {
    api.current?.chart.applyOptions({
      timeScale: { timeVisible: interval !== "1D" },
      localization: { timeFormatter: (time: Time) => formatCandleTime((time as number) * 1000, interval, true) },
    });
  }, [interval]);

  // Data: a live tick only touches the last candle; anything else redraws everything.
  useEffect(() => {
    const current = api.current;
    if (!current) return;
    indexByTime.current = new Map(candles.map((candle, i) => [chartTime(candle.timestamp), i]));

    const before = drawn.current;
    const last = candles.at(-1);
    const onlyLastChanged =
      before.colors === colors &&
      before.candles.length === candles.length &&
      candles.length > 1 &&
      before.candles[0] === candles[0] &&
      before.candles[candles.length - 2] === candles[candles.length - 2];

    if (onlyLastChanged && last) {
      current.candles.update(toBar(last));
      current.volume.update(toVolume(last, colors));
    } else {
      current.candles.setData(candles.map(toBar));
      current.volume.setData(candles.map((candle) => toVolume(candle, colors)));
      current.chart.timeScale().fitContent();
    }
    drawn.current = { candles, colors };
  }, [candles, colors]);

  // Countdown to the live candle's close, next to the live price on the axis.
  const last = candles.at(-1);
  const countdown = last ? formatCountdown(candleEnd(last.timestamp, interval) - now) : "";
  useEffect(() => {
    api.current?.candles.applyOptions({ title: countdown });
  }, [countdown]);

  const showCandle = (index: number | null) => {
    keyboardIndex.current = index;
    const current = api.current;
    const candle = index === null ? undefined : candles[index];
    if (!current || !candle) {
      current?.chart.clearCrosshairPosition();
      onHoverChange(null);
      return;
    }
    current.chart.setCrosshairPosition(candle.close, chartTime(candle.timestamp), current.candles);
    onHoverChange(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const lastIndex = candles.length - 1;
    const from = keyboardIndex.current ?? lastIndex;
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, from - step),
      ArrowRight: Math.min(lastIndex, from + step),
      Home: 0,
      End: lastIndex,
    };
    if (event.key in moves) {
      event.preventDefault();
      showCandle(moves[event.key] ?? null);
    } else if (event.key === "Escape") {
      showCandle(null);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use the arrow keys to read candles.`}
      onKeyDown={onKeyDown}
      onBlur={() => showCandle(null)}
      className="relative h-75 w-full rounded-sm"
    />
  );
}
