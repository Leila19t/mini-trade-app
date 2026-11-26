import type { Candle, CandleInterval, PriceTick } from "@mini-trade/contracts";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCandles, T0 } from "../test/candles";
import { ProChartPanel } from "./ProChartPanel";

/** The data hooks and the canvas chart are replaced: this tests the panel's own logic. */
const mocks = vi.hoisted(() => ({
  useCandles: vi.fn(),
  useLivePrice: vi.fn(),
}));
vi.mock("../hooks/useCandles", () => ({ useCandles: mocks.useCandles }));
vi.mock("../hooks/useLivePrice", () => ({ useLivePrice: mocks.useLivePrice }));
vi.mock("../components/chart/CandleChart", () => ({
  CandleChart: ({ candles, onHoverChange }: { candles: readonly Candle[]; onHoverChange: (i: number | null) => void }) => (
    <div data-testid="candle-chart" data-last-close={candles.at(-1)?.close}>
      <button onClick={() => onHoverChange(0)}>hover first candle</button>
      <button onClick={() => onHoverChange(null)}>leave chart</button>
    </div>
  ),
}));

const candles = makeCandles([131.5, 131.2, 131.88], 131.3);

function query(overrides: Record<string, unknown> = {}) {
  return {
    data: { symbol: "NVDA", interval: "15m" as CandleInterval, candles },
    isError: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderPanel(url = "/stocks/NVDA") {
  const router = createMemoryRouter(
    [{ path: "/stocks/:symbol", element: <ProChartPanel symbol="NVDA" modeToggle={<span>mode toggle</span>} /> }],
    { initialEntries: [url] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  mocks.useCandles.mockReturnValue(query());
  mocks.useLivePrice.mockReturnValue(undefined);
});

describe("ProChartPanel", () => {
  it("shows interval tabs, the mode toggle, the live candle in the legend, and the chart", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "15m" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("mode toggle")).toBeInTheDocument();
    expect(screen.getByText("Live candle")).toBeInTheDocument();
    expect(screen.getByText("131.88")).toBeInTheDocument();
    expect(screen.getByTestId("candle-chart")).toBeInTheDocument();
  });

  it("moves the last candle with live ticks", () => {
    const tick: PriceTick = { symbol: "NVDA", price: 132.4, timestamp: T0 + 40 * 60_000 };
    mocks.useLivePrice.mockReturnValue(tick);
    renderPanel();
    expect(screen.getByTestId("candle-chart")).toHaveAttribute("data-last-close", "132.4");
    // Legend "C" (close) follows the tick too; the high moved up with it.
    expect(screen.getByText("C").nextSibling).toHaveTextContent("132.40");
    expect(screen.getByText("H").nextSibling).toHaveTextContent("132.40");
  });

  it("shows the hovered candle in the legend and announces it, then returns to the live candle", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "hover first candle" }));
    expect(screen.queryByText("Live candle")).not.toBeInTheDocument();
    expect(screen.getByText(/open \$131\.30, high \$132\.00, low \$130\.80, close \$131\.50/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "leave chart" }));
    expect(screen.getByText("Live candle")).toBeInTheDocument();
  });

  it("keeps the interval in the URL and asks for its candles", async () => {
    const router = renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "1H" }));
    expect(router.state.location.search).toBe("?interval=1H");
    expect(mocks.useCandles).toHaveBeenLastCalledWith("NVDA", "1H");

    await userEvent.click(screen.getByRole("button", { name: "15m" }));
    expect(router.state.location.search).toBe(""); // the default isn't written
  });

  it("reads the interval from the URL", () => {
    renderPanel("/stocks/NVDA?interval=4H");
    expect(mocks.useCandles).toHaveBeenLastCalledWith("NVDA", "4H");
  });

  it("shows a skeleton on first load", () => {
    mocks.useCandles.mockReturnValue(query({ data: undefined }));
    renderPanel();
    expect(screen.getByText("Loading chart")).toBeInTheDocument();
    expect(screen.queryByTestId("candle-chart")).not.toBeInTheDocument();
  });

  it("keeps an error inside the card, with a retry", async () => {
    const failed = query({ data: undefined, isError: true });
    mocks.useCandles.mockReturnValue(failed);
    renderPanel();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the 15m candles");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(failed.refetch).toHaveBeenCalled();
  });

  it("dims the old candles under a progress bar while a new interval loads", () => {
    mocks.useCandles.mockReturnValue(query({ isPlaceholderData: true }));
    renderPanel("/stocks/NVDA?interval=1H");
    expect(screen.getByRole("progressbar", { name: "Loading chart" })).toBeInTheDocument();
    // Until the 1H candles arrive, the legend still describes the 15m ones on screen.
    expect(screen.getByText("NVDA · 15m")).toBeInTheDocument();
  });

  describe("fullscreen", () => {
    /** jsdom has no Fullscreen API: a minimal fake that fires `fullscreenchange` like a browser. */
    function installFullscreen() {
      let current: Element | null = null;
      const { requestFullscreen } = Element.prototype;
      const change = (element: Element | null) => {
        current = element;
        document.dispatchEvent(new Event("fullscreenchange"));
      };
      Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
      Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => current });
      document.exitFullscreen = vi.fn(async () => change(null));
      Element.prototype.requestFullscreen = vi.fn(async function (this: Element) {
        change(this);
      });
      return () => {
        Reflect.deleteProperty(document, "fullscreenEnabled");
        Reflect.deleteProperty(document, "fullscreenElement");
        Element.prototype.requestFullscreen = requestFullscreen;
      };
    }

    it("puts the chart card fullscreen with the button or F, and back", async () => {
      const uninstall = installFullscreen();
      try {
        renderPanel();
        const card = screen.getByRole("region", { name: "Price chart" });

        await userEvent.click(screen.getByRole("button", { name: "Fullscreen (F)" }));
        expect(document.fullscreenElement).toBe(card);
        expect(screen.getByRole("button", { name: "Exit fullscreen (F)" })).toBeInTheDocument();

        await act(() => userEvent.keyboard("f"));
        expect(document.fullscreenElement).toBeNull();
        expect(screen.getByRole("button", { name: "Fullscreen (F)" })).toBeInTheDocument();
      } finally {
        uninstall();
      }
    });

    it("hides the button where fullscreen isn't available", () => {
      renderPanel();
      expect(screen.queryByRole("button", { name: /Fullscreen/ })).not.toBeInTheDocument();
    });
  });
});
