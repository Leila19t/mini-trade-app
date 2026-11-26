import chevronDown from "../../assets/icons/chevron-down.svg";
import { SORT_OPTIONS } from "../../helpers/constants";
import type { SortKey } from "../../helpers/types";

interface SortSelectProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-bg-surface py-2.25 pr-2.5 pl-3 text-sm leading-[normal] transition-colors duration-120 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-primary hover:bg-bg-subtle">
      <span className="text-text-muted max-sm:sr-only">Sort by</span>
      <select
        value={value}
        onChange={(event) => {
          if (isSortKey(event.target.value)) onChange(event.target.value);
        }}
        className="field-sizing-content cursor-pointer appearance-none bg-transparent pr-6 font-medium text-text-primary outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <img
        src={chevronDown}
        alt=""
        width={16}
        height={16}
        className="pointer-events-none absolute right-2.5"
      />
    </label>
  );
}
