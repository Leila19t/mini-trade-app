import { DEFAULT_RANGE, Range } from "@mini-trade/contracts";
import { useSearchParams } from "react-router";
import { params } from "../helpers/constants";

/** The chart range, kept in the URL (?range=1M) so it's shareable and survives a refresh. */
export function useRange() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = Range.safeParse(searchParams.get(params.range));
  const range: Range = parsed.success ? parsed.data : DEFAULT_RANGE;

  const setRange = (value: Range) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === DEFAULT_RANGE) next.delete(params.range);
        else next.set(params.range, value);
        return next;
      },
      { replace: true },
    );

  return { range, setRange };
}
