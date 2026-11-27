import chartCandles from "../../assets/icons/chart-candles.svg";
import chartLine from "../../assets/icons/chart-line.svg";
import type { ChartMode } from "../../helpers/types";

const MODES: readonly { value: ChartMode; label: string; icon: string }[] = [
  { value: "simple", label: "Simple", icon: chartLine },
  { value: "pro", label: "Pro", icon: chartCandles },
];

interface ChartModeToggleProps {
  value: ChartMode;
  onChange: (mode: ChartMode) => void;
}

export function ChartModeToggle({ value, onChange }: ChartModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Chart type"
      className="flex shrink-0 gap-0.5 rounded-lg bg-bg-subtle p-0.75"
    >
      {MODES.map((mode) => {
        const selected = mode.value === value;
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={selected}
            aria-keyshortcuts="P"
            title={`${mode.label} chart (P)`}
            onClick={() => onChange(mode.value)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md py-1.25 pr-3 pl-2.5 text-[13px] leading-[normal] whitespace-nowrap transition-colors duration-120 ${
              selected
                ? "bg-bg-surface font-semibold text-text-primary shadow-[0px_1px_2px_0px_rgba(15,23,41,0.1)]"
                : "font-medium text-text-muted hover:text-text-primary"
            }`}
          >
            <img src={mode.icon} alt="" width={14} height={14} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
