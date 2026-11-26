interface ChartTabsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group, e.g. "Chart range". */
  label: string;
  /** Phones: tabs share the full width. */
  fullWidth?: boolean;
}

/** Segmented control above the chart (Figma "Range tabs"), for ranges and candle intervals. */
export function ChartTabs<T extends string>({ options, value, onChange, label, fullWidth = false }: ChartTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex gap-0.5 rounded-lg bg-bg-subtle p-0.75 ${fullWidth ? "w-full" : "w-fit"}`}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={`cursor-pointer rounded-md px-3 py-1.25 text-[13px] leading-[normal] whitespace-nowrap transition-colors duration-120 ${
              fullWidth ? "flex-1" : ""
            } ${
              selected
                ? "bg-bg-surface font-semibold text-text-primary shadow-[0px_1px_2px_0px_rgba(15,23,41,0.1)]"
                : "font-medium text-text-muted hover:text-text-primary"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
