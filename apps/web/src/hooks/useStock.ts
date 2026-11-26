import type { Ticker } from "@mini-trade/contracts";
import { useQuery } from "@tanstack/react-query";
import { request } from "../data/http";
import { queryKeys } from "../helpers/constants";

/** One stock's details and stats, for the detail page. */
export function useStock(symbol: Ticker) {
  return useQuery({
    queryKey: queryKeys.stock(symbol),
    queryFn: ({ signal }) => request("getStock", [symbol], { signal }),
  });
}
