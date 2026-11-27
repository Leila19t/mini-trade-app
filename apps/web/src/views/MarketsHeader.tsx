import { SortSelect } from "../components/markets/SortSelect";
import type { SortKey } from "../helpers/types";

interface MarketsHeaderProps {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

export function MarketsHeader({ sort, onSortChange }: MarketsHeaderProps) {
  return (
    <div className="flex items-end gap-4 max-sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[normal]">
        <h1 className="text-[28px] font-bold text-text-primary max-sm:text-2xl">
          Markets
        </h1>
        <p className="text-sm text-text-muted max-sm:hidden">
          Prices update live. Star a stock to add it to your watchlist.
        </p>
      </div>
      <SortSelect value={sort} onChange={onSortChange} />
    </div>
  );
}
