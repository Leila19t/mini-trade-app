import type { SortKey } from "../../helpers/types";

interface SortableColumn {
  label: string;
  desc: SortKey;
  asc: SortKey;
  descLabel: string;
  ascLabel: string;
}

const PRICE: SortableColumn = {
  label: "Price",
  desc: "price-desc",
  asc: "price-asc",
  descLabel: "highest first",
  ascLabel: "lowest first",
};
const TODAY: SortableColumn = {
  label: "Today",
  desc: "change-desc",
  asc: "change-asc",
  descLabel: "best first",
  ascLabel: "worst first",
};

interface ColumnHeaderProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

function SortButton({
  column,
  sort,
  onSortChange,
  className,
}: ColumnHeaderProps & { column: SortableColumn; className: string }) {
  const active = sort === column.desc || sort === column.asc;
  const next = sort === column.desc ? column.asc : column.desc;
  const arrow = sort === column.desc ? "↓" : sort === column.asc ? "↑" : "↕";

  return (
    <button
      type="button"
      onClick={() => onSortChange(next)}
      aria-label={`Sort by ${column.label.toLowerCase()}, ${next === column.desc ? column.descLabel : column.ascLabel}`}
      className={`shrink-0 cursor-pointer whitespace-nowrap transition-colors duration-120 hover:text-text-primary ${
        active ? "text-text-primary" : ""
      } ${className}`}
    >
      {column.label} <span aria-hidden>{arrow}</span>
    </button>
  );
}

export function ColumnHeader({ sort, onSortChange }: ColumnHeaderProps) {
  return (
    <div className="flex h-10 items-center gap-4 border-b border-border-default bg-bg-canvas px-5 text-xs leading-[normal] font-medium text-text-muted max-sm:hidden">
      <span className="w-5 shrink-0" />
      <span className="w-9 shrink-0" />
      <span className="w-65 min-w-0 shrink">Name</span>
      <span className="w-25 shrink-0 max-md:hidden">1D trend</span>
      <span className="flex-1" />
      <SortButton
        column={PRICE}
        sort={sort}
        onSortChange={onSortChange}
        className="w-35 text-right"
      />
      <SortButton
        column={TODAY}
        sort={sort}
        onSortChange={onSortChange}
        className="w-24 text-center"
      />
    </div>
  );
}
