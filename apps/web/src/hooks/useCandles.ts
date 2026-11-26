import type { CandleInterval, Ticker } from "@mini-trade/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { request } from "../data/http";
import { CANDLES_REFETCH_MS, queryKeys } from "../helpers/constants";

/**
 * The latest candles for one stock and interval, cached per [symbol, interval].
 * Refetched every minute; live ticks move the last candle in between (see
 * `withLivePrice`). While a new interval loads, the previous candles stay on screen.
 */
export function useCandles(symbol: Ticker, interval: CandleInterval) {
  return useQuery({
    queryKey: queryKeys.candles(symbol, interval),
    queryFn: ({ signal }) => request("getCandles", [symbol, interval], { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: CANDLES_REFETCH_MS,
  });
}
