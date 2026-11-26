import { useQuery } from "@tanstack/react-query";
import { request } from "../data/http";
import { queryKeys } from "../helpers/constants";

/** Every stock with a price snapshot. Live prices then come from useLivePrice. */
export function useStocks() {
  return useQuery({
    queryKey: queryKeys.stocks(),
    queryFn: ({ signal }) => request("listStocks", [], { signal }),
    select: (data) => data.stocks,
  });
}
