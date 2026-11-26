import type { StockDetail, Ticker } from "@mini-trade/contracts";
import { BackToMarkets } from "../components/navigation/BackToMarkets";
import { LiveStatus } from "../components/stocks/LiveStatus";
import { StarButton } from "../components/stocks/StarButton";
import { StockLogo } from "../components/stocks/StockLogo";
import { WatchButton } from "../components/stocks/WatchButton";
import { changeBetween, directionPill, directionText, formatPrice, formatSignedPercent, formatSignedPrice } from "../helpers/utils";
import { useConnectionStatus } from "../hooks/useConnectionStatus";
import { useLivePrice } from "../hooks/useLivePrice";
import { useNow } from "../hooks/useNow";
import { useWatchToggle } from "../hooks/useWatchToggle";

interface StockOverviewProps {
  symbol: Ticker;
  /** Undefined while loading: skeleton in the same layout. */
  stock: StockDetail | undefined;
}

/** Top of the detail page: back link, name, watch button, and the live price with today's change. */
export function StockOverview({ symbol, stock }: StockOverviewProps) {
  const live = useLivePrice(symbol);
  const { status } = useConnectionStatus();
  const { starred, toggle, ready } = useWatchToggle(symbol);
  const now = useNow(1000, stock !== undefined);

  const price = live?.price ?? stock?.price;
  const updatedAt = live?.timestamp ?? stock?.updatedAt ?? now;
  const change = stock && price !== undefined ? changeBetween(price, stock.stats.price24hAgo) : undefined;
  const changeText = change && `${formatSignedPrice(change.amount)} (${formatSignedPercent(change.fraction)}) today`;

  return (
    <>
      <nav className="flex items-center max-sm:pt-2">
        <BackToMarkets />
        <span className="flex-1" />
        {/* Phones: the star in the nav bar mirrors the sticky watch button. */}
        <StarButton
          symbol={symbol}
          starred={starred}
          onToggle={toggle}
          disabled={!ready}
          size={24}
          className="sm:hidden"
        />
      </nav>

      <header className="flex items-center gap-3.5 max-sm:gap-2.5">
        <StockLogo symbol={symbol} size="detail" />
        <div className="flex min-w-0 flex-col gap-0.5 leading-[normal] max-sm:gap-0">
          <h1 className="text-2xl font-bold text-text-primary max-sm:text-lg">{symbol}</h1>
          {stock ? (
            <p className="truncate text-sm text-text-muted max-sm:text-[13px]">
              {stock.name}
              <span className="max-sm:hidden">
                <span aria-hidden>{"  ·  "}</span>
                <span className="sr-only">, </span>
                {stock.exchange}
              </span>
            </p>
          ) : (
            <span className="mt-1 h-3.5 w-40 animate-pulse rounded-md bg-bg-subtle motion-reduce:animate-none" />
          )}
        </div>
        <span className="flex-1" />
        <WatchButton starred={starred} onToggle={toggle} disabled={!ready} className="max-sm:hidden" />
      </header>

      {price !== undefined && change ? (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 max-sm:flex-col max-sm:items-start">
          <p className="text-[40px] leading-[normal] font-bold text-text-primary tabular-nums max-sm:text-[34px]">
            <span className="sr-only">Price </span>
            {formatPrice(price)}
          </p>
          <div className="flex items-center gap-3.5 max-sm:gap-2">
            <span
              className={`rounded-md px-2.5 py-1.25 text-sm leading-[normal] font-semibold whitespace-nowrap tabular-nums max-sm:hidden ${directionPill[change.direction]}`}
            >
              {changeText}
            </span>
            <span
              className={`text-sm leading-[normal] font-semibold whitespace-nowrap tabular-nums sm:hidden ${directionText[change.direction]}`}
            >
              {changeText}
            </span>
            <LiveStatus status={status} updatedAt={updatedAt} now={now} />
          </div>
        </div>
      ) : (
        <div aria-hidden className="flex h-12 items-center gap-3.5">
          <span className="h-10 w-40 animate-pulse rounded-lg bg-bg-subtle motion-reduce:animate-none" />
          <span className="h-7 w-44 animate-pulse rounded-md bg-bg-subtle motion-reduce:animate-none" />
        </div>
      )}
    </>
  );
}
