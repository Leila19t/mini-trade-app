import { useSearchParams } from "react-router";
import { DEFAULT_SORT, LIST_TABS, params, SORT_OPTIONS } from "../helpers/constants";
import type { ListTab, SortKey } from "../helpers/types";

function isTab(value: string | null): value is ListTab {
  return LIST_TABS.some((tab) => tab.value === value);
}

function isSort(value: string | null): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * The stock list's state, kept in the URL (?q=&tab=&sort=) so it's shareable and
 * survives a refresh. Unknown values fall back to the defaults
 */
export function useMarketsParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get(params.tab);
  const sortParam = searchParams.get(params.sort);
  const tab: ListTab = isTab(tabParam) ? tabParam : "all";
  const sort: SortKey = isSort(sortParam) ? sortParam : DEFAULT_SORT;

  const update = (key: string, value: string, fallback: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  return {
    search: searchParams.get(params.search) ?? "",
    tab,
    sort,
    setTab: (value: ListTab) => update(params.tab, value, "all"),
    setSort: (value: SortKey) => update(params.sort, value, DEFAULT_SORT),
  };
}
