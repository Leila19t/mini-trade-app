import type { StockSummary } from "@mini-trade/contracts";
import { ColumnHeader } from "../components/markets/ColumnHeader";
import { StockRowSkeleton } from "../components/stocks/StockRowSkeleton";
import { SKELETON_ROWS } from "../helpers/constants";
import type { SortKey } from "../helpers/types";
import { StockListItem } from "./StockListItem";

interface StockListProps {
  id: string;
  /** In display order. Undefined while loading: skeleton rows. */
  stocks: readonly StockSummary[] | undefined;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  /** Live prices paused: rows stay visible but dimmed. */
  stale: boolean;
  label: string;
}

/** The stock table (Figma "Table"): column header plus rows. Full-bleed on phones. */
export function StockList({ id, stocks, sort, onSortChange, stale, label }: StockListProps) {
  return (
    <div
      id={id}
      role="tabpanel"
      className="overflow-hidden rounded-xl border border-border-default bg-bg-surface max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0"
    >
      <ColumnHeader sort={sort} onSortChange={onSortChange} />
      <ul aria-label={label} aria-busy={!stocks} data-stale={stale} className="group/list">
        {stocks
          ? stocks.map((stock) => <StockListItem key={stock.symbol} stock={stock} />)
          : Array.from({ length: SKELETON_ROWS }, (_, i) => <StockRowSkeleton key={i} />)}
      </ul>
    </div>
  );
}
