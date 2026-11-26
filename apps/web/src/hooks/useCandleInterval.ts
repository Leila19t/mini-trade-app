import { CandleInterval, DEFAULT_CANDLE_INTERVAL } from "@mini-trade/contracts";
import { useSearchParams } from "react-router";
import { params } from "../helpers/constants";

/** The Pro chart's candle size, kept in the URL (?interval=1H) like the range. */
export function useCandleInterval() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = CandleInterval.safeParse(searchParams.get(params.interval));
  const interval: CandleInterval = parsed.success ? parsed.data : DEFAULT_CANDLE_INTERVAL;

  const setInterval = (value: CandleInterval) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === DEFAULT_CANDLE_INTERVAL) next.delete(params.interval);
        else next.set(params.interval, value);
        return next;
      },
      { replace: true },
    );

  return { interval, setInterval };
}
