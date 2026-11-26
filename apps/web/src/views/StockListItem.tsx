import type { StockSummary } from "@mini-trade/contracts";
import { memo, useMemo } from "react";
import { StockRow } from "../components/stocks/StockRow";
import { paths } from "../helpers/constants";
import { changeBetween } from "../helpers/utils";
import { useLivePrice } from "../hooks/useLivePrice";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { useWatchToggle } from "../hooks/useWatchToggle";

interface StockListItemProps {
  stock: StockSummary;
}

export const StockListItem = memo(function StockListItem({
  stock,
}: StockListItemProps) {
  const live = useLivePrice(stock.symbol);
  const price = live?.price ?? stock.price;
  const flash = usePriceFlash(live?.price);
  const { starred, toggle, ready } = useWatchToggle(stock.symbol);

  const trend = useMemo(
    () => (live ? [...stock.trend, live.price] : stock.trend),
    [stock.trend, live],
  );

  return (
    <StockRow
      stock={stock}
      href={paths.stock(stock.symbol)}
      price={price}
      change={changeBetween(price, stock.price24hAgo)}
      trend={trend}
      starred={starred}
      starDisabled={!ready}
      onToggleStar={toggle}
      flash={flash}
    />
  );
});
