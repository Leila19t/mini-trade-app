import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeCandles } from "../../test/candles";
import { CandleLegend } from "./CandleLegend";

const [up, down] = makeCandles([131.88, 130.5], 131.74);
if (!up || !down) throw new Error("fixture");

describe("CandleLegend", () => {
  it("shows the series, open, high, low, close and volume", () => {
    render(<CandleLegend symbol="NVDA" interval="15m" candle={up} live={false} />);
    expect(screen.getByText("NVDA · 15m")).toBeInTheDocument();
    expect(screen.getByText("131.74")).toBeInTheDocument(); // open
    expect(screen.getByText("132.38")).toBeInTheDocument(); // high
    expect(screen.getByText("131.24")).toBeInTheDocument(); // low
    expect(screen.getByText("131.88")).toBeInTheDocument(); // close
    expect(screen.getByText("1K")).toBeInTheDocument(); // volume
  });

  it("spells out the change with a sign, never colour alone", () => {
    const { rerender } = render(<CandleLegend symbol="NVDA" interval="15m" candle={up} live={false} />);
    expect(screen.getByText("+$0.14 (+0.11%)")).toHaveClass("text-price-up");

    rerender(<CandleLegend symbol="NVDA" interval="15m" candle={down} live={false} />);
    expect(screen.getByText("−$1.38 (−1.05%)")).toHaveClass("text-price-down");
  });

  it("marks the live candle", () => {
    const { rerender } = render(<CandleLegend symbol="NVDA" interval="15m" candle={up} live />);
    expect(screen.getByText("Live candle")).toBeInTheDocument();
    rerender(<CandleLegend symbol="NVDA" interval="15m" candle={up} live={false} />);
    expect(screen.queryByText("Live candle")).not.toBeInTheDocument();
  });
});
