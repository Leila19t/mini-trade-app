import type { Ticker } from "@mini-trade/contracts";
import { logoLetter } from "../../helpers/utils";

const sizes = {
  /** List rows: 36px, 32px on phones. */
  row: "size-9 text-[13px] max-sm:size-8 max-sm:text-xs",
  /** Detail header: 48px, 36px on phones. */
  detail: "size-12 text-lg max-sm:size-9 max-sm:text-sm",
};

interface StockLogoProps {
  symbol: Ticker;
  size: keyof typeof sizes;
}

/** Placeholder logo: the symbol's first letter in a circle. Decorative; the symbol is always shown next to it. */
export function StockLogo({ symbol, size }: StockLogoProps) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-bg-subtle leading-[normal] font-semibold text-text-secondary ${sizes[size]}`}
    >
      {logoLetter(symbol)}
    </span>
  );
}
