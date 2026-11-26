import type { Range, Ticker } from "@mini-trade/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { request } from "../data/http";
import { queryKeys } from "../helpers/constants";

/**
 * Chart history for one stock and range, cached per [symbol, range].
 * While a new range loads, the previous one stays on screen (`isPlaceholderData`)
 * so the chart doesn't flash empty.
 */
export function useHistory(symbol: Ticker, range: Range) {
  return useQuery({
    queryKey: queryKeys.history(symbol, range),
    queryFn: ({ signal }) => request("getHistory", [symbol, range], { signal }),
    placeholderData: keepPreviousData,
  });
}
