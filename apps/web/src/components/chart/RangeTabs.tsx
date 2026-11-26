import { RANGES, type Range } from "@mini-trade/contracts";
import { ChartTabs } from "./ChartTabs";

interface RangeTabsProps {
  value: Range;
  onChange: (range: Range) => void;
  /** Phones: tabs share the full width. */
  fullWidth?: boolean;
}

/** 1D · 1W · 1M · 3M · 1Y · 5Y, for the Simple chart. */
export function RangeTabs({ value, onChange, fullWidth }: RangeTabsProps) {
  return <ChartTabs options={RANGES} value={value} onChange={onChange} label="Chart range" fullWidth={fullWidth} />;
}
