import { CANDLE_INTERVALS, type CandleInterval } from "@mini-trade/contracts";
import { ChartTabs } from "./ChartTabs";

interface IntervalTabsProps {
  value: CandleInterval;
  onChange: (interval: CandleInterval) => void;
}

/** 1m · 5m · 15m · 1H · 4H · 1D, for the Pro chart. */
export function IntervalTabs({ value, onChange }: IntervalTabsProps) {
  return (
    <ChartTabs
      options={CANDLE_INTERVALS}
      value={value}
      onChange={onChange}
      label="Candle interval"
    />
  );
}
