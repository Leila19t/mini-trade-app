import type { Ticker } from "@mini-trade/contracts";
import { lazy, Suspense } from "react";
import { ChartCard } from "../components/chart/ChartCard";
import { ChartLoading } from "../components/chart/ChartLoading";
import { ChartModeToggle } from "../components/chart/ChartModeToggle";
import { PRO_CHART_MEDIA_QUERY } from "../helpers/constants";
import { useChartMode } from "../hooks/useChartMode";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { SimpleChartPanel } from "./SimpleChartPanel";

// Loaded on first use: phones and Simple-only visitors never download the chart library.
const ProChartPanel = lazy(() => import("./ProChartPanel").then((module) => ({ default: module.ProChartPanel })));

interface PriceChartPanelProps {
  symbol: Ticker;
}

/**
 * The chart card on the detail page: Simple (area chart over a range) or Pro
 * (candlesticks over an interval). Pro is desktop only; phones always get
 * Simple and never load candles. P switches mode.
 */
export function PriceChartPanel({ symbol }: PriceChartPanelProps) {
  const wide = useMediaQuery(PRO_CHART_MEDIA_QUERY);
  const { mode, setMode, toggleMode } = useChartMode();
  useKeyboardShortcut("p", () => {
    if (wide) toggleMode();
  });

  if (!wide) return <SimpleChartPanel symbol={symbol} />;

  const toggle = <ChartModeToggle value={mode} onChange={setMode} />;
  // The key restarts the fade-in when the mode changes.
  return (
    <div key={mode} className="animate-fade-in motion-reduce:animate-none">
      {mode === "pro" ? (
        <Suspense
          fallback={
            <ChartCard loading>
              <ChartLoading />
            </ChartCard>
          }
        >
          <ProChartPanel symbol={symbol} modeToggle={toggle} />
        </Suspense>
      ) : (
        <SimpleChartPanel symbol={symbol} modeToggle={toggle} />
      )}
    </div>
  );
}
