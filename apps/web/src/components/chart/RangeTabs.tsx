import { RANGES, type Range } from "@mini-trade/contracts";

interface RangeTabsProps {
  value: Range;
  onChange: (range: Range) => void;
  /** Phones: tabs share the full width. */
  fullWidth?: boolean;
}

/** 1D · 1W · 1M · 3M · 1Y · 5Y segmented control (Figma "Range tabs"). */
export function RangeTabs({ value, onChange, fullWidth = false }: RangeTabsProps) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className={`flex gap-0.5 rounded-lg bg-bg-subtle p-0.75 ${fullWidth ? "w-full" : "w-fit"}`}
    >
      {RANGES.map((range) => {
        const selected = range === value;
        return (
          <button
            key={range}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(range)}
            className={`cursor-pointer rounded-md px-3 py-1.25 text-[13px] leading-[normal] whitespace-nowrap transition-colors duration-120 ${
              fullWidth ? "flex-1" : ""
            } ${
              selected
                ? "bg-bg-surface font-semibold text-text-primary shadow-[0px_1px_2px_0px_rgba(15,23,41,0.1)]"
                : "font-medium text-text-muted hover:text-text-primary"
            }`}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}
