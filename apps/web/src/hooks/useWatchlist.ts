import { useQuery } from "@tanstack/react-query";
import { request } from "../data/http";
import { queryKeys } from "../helpers/constants";

/** The user's starred symbols, most recently added first. */
export function useWatchlist() {
  return useQuery({
    queryKey: queryKeys.watchlist(),
    queryFn: ({ signal }) => request("getWatchlist", [], { signal }),
    select: (data) => data.symbols,
  });
}
