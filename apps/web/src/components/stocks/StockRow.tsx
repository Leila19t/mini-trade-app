import type { StockSummary } from "@mini-trade/contracts";
import { Link } from "react-router";
import {
  directionPill,
  directionText,
  formatPrice,
  formatSignedPercent,
  type Change,
} from "../../helpers/utils";
import type { PriceFlash } from "../../hooks/usePriceFlash";
import { Sparkline } from "./Sparkline";
import { StarButton } from "./StarButton";
import { StockLogo } from "./StockLogo";

const flashColors = {
  up: "bg-price-up-subtle",
  down: "bg-price-down-subtle",
};

interface StockRowProps {
  stock: Pick<StockSummary, "symbol" | "name">;
  href: string;
  price: number;
  change: Change;
  trend: readonly number[];
  starred: boolean;
  starDisabled: boolean;
  onToggleStar: () => void;
  flash: PriceFlash | null;
}

export function StockRow({
  stock,
  href,
  price,
  change,
  trend,
  starred,
  starDisabled,
  onToggleStar,
  flash,
}: StockRowProps) {
  const percent = formatSignedPercent(change.fraction);
  const stale =
    "transition-opacity duration-200 group-data-[stale=true]/list:opacity-50";

  return (
    <li className="relative isolate flex h-16 items-center gap-4 border-b border-border-default bg-bg-surface px-5 transition-[background-color,scale] duration-120 last:border-b-0 hover:bg-bg-subtle active:scale-[0.99] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-brand-primary max-sm:gap-3 max-sm:px-4">
      {flash && (
        <span
          key={flash.key}
          aria-hidden
          className={`pointer-events-none absolute inset-0 -z-10 animate-flash motion-reduce:hidden ${flashColors[flash.direction]}`}
        />
      )}

      <StarButton
        symbol={stock.symbol}
        starred={starred}
        onToggle={onToggleStar}
        disabled={starDisabled}
        className="relative z-10"
      />
      <StockLogo symbol={stock.symbol} size="row" />

      <Link
        to={href}
        className="flex w-65 min-w-0 shrink flex-col gap-0.5 leading-[normal] outline-none after:absolute after:inset-0 after:content-[''] max-sm:w-auto max-sm:flex-1"
      >
        <span className="text-sm font-semibold text-text-primary max-sm:text-[15px]">
          {stock.symbol}
        </span>
        <span className="truncate text-[13px] text-text-muted">
          {stock.name}
        </span>
      </Link>

      <Sparkline
        values={trend}
        direction={change.direction}
        className="max-md:hidden"
      />
      <span className="flex-1 max-sm:hidden" />

      {/* Desktop: price column + change pill. */}
      <span
        className={`w-35 shrink-0 text-right text-[15px] leading-[normal] font-medium text-text-primary tabular-nums max-sm:hidden ${stale}`}
      >
        {formatPrice(price)}
      </span>
      <span
        className={`inline-flex h-7 w-24 shrink-0 items-center justify-center rounded-md text-[13px] leading-[normal] font-semibold tabular-nums max-sm:hidden ${directionPill[change.direction]} ${stale}`}
      >
        <span className="sr-only">Today </span>
        {percent}
      </span>

      {/* Phone: price over change. */}
      <span
        className={`flex shrink-0 flex-col items-end gap-0.5 leading-[normal] tabular-nums sm:hidden ${stale}`}
      >
        <span className="text-[15px] font-medium text-text-primary">
          {formatPrice(price)}
        </span>
        <span
          className={`text-[13px] font-semibold ${directionText[change.direction]}`}
        >
          <span className="sr-only">Today </span>
          {percent}
        </span>
      </span>
    </li>
  );
}
