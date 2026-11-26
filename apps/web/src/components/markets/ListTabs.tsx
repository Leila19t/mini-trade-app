import { LIST_TABS } from "../../helpers/constants";
import type { ListTab } from "../../helpers/types";

interface ListTabsProps {
  selected: ListTab;
  counts: Record<ListTab, number | undefined>;
  onSelect: (tab: ListTab) => void;
  /** id of the list the tabs control. */
  controls: string;
}

/** "All stocks" / "Watchlist" with counts (Figma "Tab"). */
export function ListTabs({ selected, counts, onSelect, controls }: ListTabsProps) {
  return (
    <div role="tablist" aria-label="Stock lists" className="flex gap-6 border-b border-border-default max-sm:gap-5">
      {LIST_TABS.map(({ value, label }) => {
        const isSelected = value === selected;
        const count = counts[value];
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={controls}
            onClick={() => onSelect(value)}
            className={`flex cursor-pointer items-center gap-2 px-1 pt-2 pb-3 text-sm leading-[normal] whitespace-nowrap transition-colors duration-120 ${
              isSelected
                ? "border-b-2 border-brand-primary font-semibold text-text-primary"
                : "font-medium text-text-muted hover:text-text-secondary"
            }`}
          >
            {label}
            {count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  isSelected ? "bg-brand-primary text-brand-on-primary" : "bg-bg-subtle text-text-muted"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
