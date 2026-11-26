import type { CandleInterval, CandlesResponse, Ticker } from "@mini-trade/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { request } from "../data/http";
import { msUntilNextCandle } from "../helpers/candles";
import { CANDLES_REFETCH, queryKeys } from "../helpers/constants";

/** Until the server has a candle we don't: the data is fresh until then, and refetched right after. */
const untilNextCandle = ({ state }: { state: { data?: CandlesResponse } }) =>
  state.data
    ? msUntilNextCandle(state.data.candles, state.data.interval, Date.now(), CANDLES_REFETCH.lagMs)
    : 0;

/** 0 would switch polling off, so there's a floor. */
const refetchAfter = (query: Parameters<typeof untilNextCandle>[0]) =>
  Math.max(untilNextCandle(query), CANDLES_REFETCH.minMs);

/**
 * The latest candles for one stock and interval, cached per [symbol, interval].
 * Live ticks move the last candle (see `withLivePrice`); the candles are only
 * refetched once a candle closes, so every minute for 1m but once a day for 1D.
 * While a new interval loads, the previous candles stay on screen.
 */
export function useCandles(symbol: Ticker, interval: CandleInterval) {
  return useQuery({
    queryKey: queryKeys.candles(symbol, interval),
    queryFn: ({ signal }) => request("getCandles", [symbol, interval], { signal }),
    placeholderData: keepPreviousData,
    staleTime: untilNextCandle,
    refetchInterval: refetchAfter,
  });
}
