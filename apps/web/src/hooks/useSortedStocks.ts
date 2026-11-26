import type { StockSummary } from "@mini-trade/contracts";
import { useMemo } from "react";
import { shallowEqual } from "react-redux";
import { useAppSelector } from "../data/store";
import { sortStocks } from "../helpers/utils";
import type { SortKey } from "../helpers/types";

/**
 * Stocks in display order. Price and change sorts use live prices, but the
 * selector returns only the *order* of symbols (compared shallowly), so the
 * list re-renders when rows swap places, not on every tick.
 */
export function useSortedStocks(stocks: readonly StockSummary[], sort: SortKey): StockSummary[] {
  const order = useAppSelector(
    (state) =>
      sortStocks(stocks, sort, (symbol) => (sort === "name" ? undefined : state.prices[symbol]?.price)).map(
        (stock) => stock.symbol,
      ),
    shallowEqual,
  );

  return useMemo(() => {
    const bySymbol = new Map(stocks.map((stock) => [stock.symbol, stock]));
    return order.flatMap((symbol) => bySymbol.get(symbol) ?? []);
  }, [order, stocks]);
}
