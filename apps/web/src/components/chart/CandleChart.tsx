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
import { CANDLE_ZOOM } from "../../helpers/constants";
import { formatPrice } from "../../helpers/utils";
import { useNow } from "../../hooks/useNow";
import type { Theme } from "../../helpers/types";
import { useTheme } from "../../hooks/useTheme";
import { ZoomControls } from "./ZoomControls";

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

/** Shows the latest `count` candles, flush with the live one. */
function showLatest(chart: IChartApi, total: number, count: number = CANDLE_ZOOM.initial) {
  chart.timeScale().setVisibleLogicalRange({ from: total - count - 0.5, to: total - 0.5 });
}

/**
 * Zooms by `factor` (> 1 zooms in), keeping the right edge where it is, like
 * TradingView's buttons. Never closer than `CANDLE_ZOOM.min` candles or wider than all of them.
 */
function zoomBy(chart: IChartApi, total: number, factor: number) {
  const timeScale = chart.timeScale();
  const range = timeScale.getVisibleLogicalRange();
  if (!range) return;
  const width = Math.min(Math.max((range.to - range.from) / factor, CANDLE_ZOOM.min), total);
  timeScale.setVisibleLogicalRange({ from: range.to - width, to: range.to });
}

/** What's on the chart now. `interval` is the one the view was last reset for. */
interface DrawnState {
  candles: readonly Candle[];
  colors: ChartColors | null;
  interval: CandleInterval | null;
}
const EMPTY_DRAWN: DrawnState = { candles: [], colors: null, interval: null };

/** Scrolls just enough to show candle `index`, keeping the zoom. */
function scrollIntoView(chart: IChartApi, index: number) {
  const timeScale = chart.timeScale();
  const range = timeScale.getVisibleLogicalRange();
  if (!range || (index - 0.5 >= range.from && index + 0.5 <= range.to)) return;
  const width = range.to - range.from;
  const from = index - 0.5 < range.from ? index - 0.5 : index + 0.5 - width;
  timeScale.setVisibleLogicalRange({ from, to: from + width });
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
  /** Fill the parent's height (fullscreen) instead of the fixed card height. */
  fill?: boolean;
}

/**
 * Candlesticks with volume underneath, drawn by TradingView's Lightweight
 * Charts. The last candle is live: the dashed line and the axis tag mark the
 * live price, with a countdown until the candle closes. Hover shows the
 * crosshair; arrow keys step through candles for keyboard users.
 *
 * It opens on the latest `CANDLE_ZOOM.initial` candles. Drag (or swipe) to see
 * older ones; the wheel, a pinch, the buttons or +/− zoom; 0 goes back to the
 * latest. Live ticks and refetches keep whatever view the user picked.
 */
export function CandleChart({ candles, interval, label, onHoverChange, fill = false }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const api = useRef<ChartApi | null>(null);
  /** What's on the chart now, so a live tick only redraws the last candle. */
  const drawn = useRef<DrawnState>(EMPTY_DRAWN);
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
      // Drag or swipe through history; the wheel and pinch zoom (so the page doesn't scroll over the chart).
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: false },
        axisDoubleClickReset: { time: true, price: true },
      },
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
    drawn.current = EMPTY_DRAWN;
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
  // The view only resets for the first data and a new interval, so ticks and refetches keep the user's zoom.
  useEffect(() => {
    const current = api.current;
    if (!current) return;
    indexByTime.current = new Map(candles.map((candle, i) => [chartTime(candle.timestamp), i]));

    const before = drawn.current;
    const last = candles.at(-1);
    const onlyLastChanged =
      before.colors === colors &&
      before.interval === interval &&
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
      if (before.interval !== interval) showLatest(current.chart, candles.length);
    }
    drawn.current = { candles, colors, interval };
  }, [candles, colors, interval]);

  const zoomIn = () => api.current && zoomBy(api.current.chart, candles.length, CANDLE_ZOOM.step);
  const zoomOut = () => api.current && zoomBy(api.current.chart, candles.length, 1 / CANDLE_ZOOM.step);
  const resetView = () => api.current && showLatest(api.current.chart, candles.length);

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
    if (!current || !candle || index === null) {
      current?.chart.clearCrosshairPosition();
      onHoverChange(null);
      return;
    }
    scrollIntoView(current.chart, index);
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
    const zooms: Record<string, () => void> = { "+": zoomIn, "=": zoomIn, "-": zoomOut, "_": zoomOut, "0": resetView };
    const zoom = zooms[event.key];
    if (zoom) {
      event.preventDefault();
      zoom();
    } else if (event.key in moves) {
      event.preventDefault();
      showCandle(moves[event.key] ?? null);
    } else if (event.key === "Escape") {
      showCandle(null);
    }
  };

  return (
    <div className={`relative w-full ${fill ? "h-full min-h-75" : "h-75"}`}>
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Arrow keys read candles, plus and minus zoom, 0 resets the view.`}
        onKeyDown={onKeyDown}
        onBlur={() => showCandle(null)}
        className="size-full cursor-crosshair rounded-sm"
      />
      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  );
}
