import type { Candle } from "@mini-trade/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toChartTime } from "../../helpers/candles";
import { makeCandles } from "../../test/candles";
import { CandleChart } from "./CandleChart";

/**
 * Lightweight Charts draws on a canvas, which jsdom can't render. The library
 * is replaced by a fake that records calls, so these tests check what the
 * component asks the chart to do.
 */
const fake = vi.hoisted(() => {
  const series = () => ({ setData: vi.fn(), update: vi.fn(), applyOptions: vi.fn() });
  const state = {
    candles: series(),
    volume: series(),
    crosshairHandler: undefined as undefined | ((param: { time?: number }) => void),
    chart: {
      applyOptions: vi.fn(),
      addSeries: vi.fn(),
      priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
      timeScale: vi.fn(),
      /** The visible logical range (candle indexes) the component last set. */
      visibleRange: null as null | { from: number; to: number },
      getVisibleLogicalRange: vi.fn(),
      setVisibleLogicalRange: vi.fn(),
      subscribeCrosshairMove: vi.fn(),
      setCrosshairPosition: vi.fn(),
      clearCrosshairPosition: vi.fn(),
      remove: vi.fn(),
    },
  };
  return { state, series };
});

vi.mock("lightweight-charts", () => ({
  CandlestickSeries: { type: "Candlestick" },
  HistogramSeries: { type: "Histogram" },
  ColorType: { Solid: "solid" },
  CrosshairMode: { Normal: 0 },
  LineStyle: { Solid: 0, Dashed: 2 },
  TickMarkType: { Year: 0, Month: 1, DayOfMonth: 2, Time: 3 },
  createChart: () => fake.state.chart,
}));

const { state } = fake;
const UP = "#0e7a3f";
const DOWN = "#c2332b";

beforeAll(() => {
  // The chart reads the design tokens from <html>; tokens.css isn't loaded in tests.
  document.documentElement.style.setProperty("--price-up", UP);
  document.documentElement.style.setProperty("--price-down", DOWN);
});

beforeEach(() => {
  vi.clearAllMocks();
  state.candles = fake.series();
  state.volume = fake.series();
  state.chart.addSeries.mockImplementation((definition: { type: string }) =>
    definition.type === "Candlestick" ? state.candles : state.volume,
  );
  state.chart.visibleRange = null;
  state.chart.getVisibleLogicalRange.mockImplementation(() => state.chart.visibleRange);
  state.chart.setVisibleLogicalRange.mockImplementation((range: { from: number; to: number }) => {
    state.chart.visibleRange = range;
  });
  state.chart.timeScale.mockReturnValue({
    getVisibleLogicalRange: state.chart.getVisibleLogicalRange,
    setVisibleLogicalRange: state.chart.setVisibleLogicalRange,
  });
  state.chart.subscribeCrosshairMove.mockImplementation((handler: (param: { time?: number }) => void) => {
    state.crosshairHandler = handler;
  });
});

const candles = makeCandles([101, 99, 102]); // up, down, up
const renderChart = (data: readonly Candle[] = candles, onHoverChange = vi.fn()) => {
  const view = render(<CandleChart candles={data} interval="15m" label="NVDA candles, 15m" onHoverChange={onHoverChange} />);
  return { ...view, onHoverChange };
};

describe("CandleChart", () => {
  it("draws every candle and its volume, coloured by direction at 35%", () => {
    renderChart();
    expect(state.candles.setData).toHaveBeenCalledWith(
      candles.map((c) => ({ time: toChartTime(c.timestamp), open: c.open, high: c.high, low: c.low, close: c.close })),
    );
    const volumes = state.volume.setData.mock.lastCall?.[0];
    expect(volumes.map((v: { value: number }) => v.value)).toEqual([1000, 2000, 3000]);
    expect(volumes.map((v: { color: string }) => v.color)).toEqual([
      "rgba(14, 122, 63, 0.35)",
      "rgba(194, 51, 43, 0.35)",
      "rgba(14, 122, 63, 0.35)",
    ]);
  });

  it("opens on the latest candles", () => {
    renderChart(makeCandles(Array.from({ length: 100 }, (_, i) => 100 + i)));
    expect(state.chart.visibleRange).toEqual({ from: 100 - 64 - 0.5, to: 99.5 });
  });

  it("keeps the user's view on live ticks and new candles, and resets it for a new interval", () => {
    const { rerender, onHoverChange } = renderChart();
    state.chart.visibleRange = { from: 0.5, to: 1.5 }; // the user dragged / zoomed
    state.chart.setVisibleLogicalRange.mockClear();

    const next = makeCandles([101, 99, 102, 104]).slice(1);
    rerender(<CandleChart candles={next} interval="15m" label="x" onHoverChange={onHoverChange} />);
    expect(state.chart.setVisibleLogicalRange).not.toHaveBeenCalled();

    rerender(<CandleChart candles={next} interval="1H" label="x" onHoverChange={onHoverChange} />);
    expect(state.chart.setVisibleLogicalRange).toHaveBeenCalledTimes(1);
  });

  it("zooms with the buttons and the keyboard, keeping the right edge", async () => {
    const data = makeCandles(Array.from({ length: 200 }, (_, i) => 100 + i));
    renderChart(data);
    const width = () => (state.chart.visibleRange ? state.chart.visibleRange.to - state.chart.visibleRange.from : 0);

    fireEvent.click(screen.getByRole("button", { name: /Zoom in/ }));
    expect(width()).toBeCloseTo(64 / 1.5);
    expect(state.chart.visibleRange?.to).toBe(199.5);

    fireEvent.click(screen.getByRole("button", { name: /Zoom out/ }));
    expect(width()).toBeCloseTo(64);

    const chart = screen.getByRole("group", { name: /NVDA candles/ });
    for (let i = 0; i < 10; i++) fireEvent.keyDown(chart, { key: "+" });
    expect(width()).toBe(12); // never closer than the minimum
    for (let i = 0; i < 20; i++) fireEvent.keyDown(chart, { key: "-" });
    expect(width()).toBe(200); // never wider than every candle

    fireEvent.keyDown(chart, { key: "0" });
    expect(state.chart.visibleRange).toEqual({ from: 200 - 64 - 0.5, to: 199.5 });
  });

  it("scrolls a candle picked with the keyboard into view", () => {
    renderChart(makeCandles(Array.from({ length: 100 }, (_, i) => 100 + i)));
    fireEvent.keyDown(screen.getByRole("group", { name: /NVDA candles/ }), { key: "Home" });
    expect(state.chart.visibleRange).toEqual({ from: -0.5, to: 63.5 });
  });

  it("uses a crosshair cursor", () => {
    renderChart();
    expect(screen.getByRole("group", { name: /NVDA candles/ })).toHaveClass("cursor-crosshair");
  });

  it("only updates the last candle on a live tick", () => {
    const { rerender, onHoverChange } = renderChart();
    state.candles.setData.mockClear();

    const ticked = [...candles.slice(0, -1), { ...candles[2], close: 102.5, high: 103 } as Candle];
    rerender(<CandleChart candles={ticked} interval="15m" label="x" onHoverChange={onHoverChange} />);

    expect(state.candles.setData).not.toHaveBeenCalled();
    expect(state.candles.update).toHaveBeenCalledWith(expect.objectContaining({ close: 102.5, high: 103 }));
  });

  it("redraws everything when a new candle starts", () => {
    const { rerender, onHoverChange } = renderChart();
    state.candles.setData.mockClear();

    const next = makeCandles([101, 99, 102, 104]).slice(1);
    rerender(<CandleChart candles={next} interval="15m" label="x" onHoverChange={onHoverChange} />);
    expect(state.candles.setData).toHaveBeenCalledTimes(1);
  });

  it("shows a countdown to the live candle's close next to the live price", () => {
    renderChart();
    const titles = state.candles.applyOptions.mock.calls.map(([options]) => options.title).filter(Boolean);
    expect(titles.at(-1)).toMatch(/^\d+(:\d{2}){1,2}$/);
  });

  it("reports the candle under the crosshair, and null when the pointer leaves", () => {
    const { onHoverChange } = renderChart();
    state.crosshairHandler?.({ time: toChartTime(candles[1]?.timestamp ?? 0) });
    expect(onHoverChange).toHaveBeenLastCalledWith(1);
    state.crosshairHandler?.({});
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
  });

  it("steps through candles with the arrow keys, Home and End, and clears with Escape", () => {
    const { onHoverChange } = renderChart();
    const chart = screen.getByRole("group", { name: /^NVDA candles, 15m/ });

    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(onHoverChange).toHaveBeenLastCalledWith(1);
    expect(state.chart.setCrosshairPosition).toHaveBeenLastCalledWith(99, toChartTime(candles[1]?.timestamp ?? 0), state.candles);

    fireEvent.keyDown(chart, { key: "Home" });
    expect(onHoverChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(chart, { key: "End" });
    expect(onHoverChange).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(chart, { key: "Escape" });
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
    expect(state.chart.clearCrosshairPosition).toHaveBeenCalled();
  });

  it("removes the chart when it unmounts", () => {
    const { unmount } = renderChart();
    unmount();
    expect(state.chart.remove).toHaveBeenCalled();
  });
});
