import type { Ticker } from "@mini-trade/contracts";
import { logoLetter } from "../../helpers/utils";

const sizes = {
  row: "size-9 text-[13px] max-sm:size-8 max-sm:text-xs",

  detail: "size-12 text-lg max-sm:size-9 max-sm:text-sm",
};

interface StockLogoProps {
  symbol: Ticker;
  size: keyof typeof sizes;
}

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
