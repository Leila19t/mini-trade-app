import { useLocation, useNavigate, useSearchParams } from "react-router";
import { params, paths } from "../helpers/constants";

/**
 * The stock search text, stored in the URL (?q=). Typing on the markets screen
 * filters in place; typing anywhere else jumps to the markets screen with the query.
 */
export function useSearchQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onMarkets = pathname === paths.markets();

  const setQuery = (value: string) => {
    if (!onMarkets) {
      navigate(paths.markets({ search: value }));
      return;
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(params.search, value);
        else next.delete(params.search);
        return next;
      },
      { replace: true }, // one history entry per search, not per keystroke
    );
  };

  return { query: onMarkets ? (searchParams.get(params.search) ?? "") : "", setQuery };
}
