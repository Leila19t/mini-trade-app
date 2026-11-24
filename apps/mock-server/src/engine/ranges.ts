import type { Range } from "@mini-trade/contracts";
import { DAY, HOUR, MINUTE, WEEK } from "./time";

export interface RangeConfig {
  /** How far back the chart reaches. */
  window: number;
  /** Spacing between chart points. Must be one of the history levels. */
  interval: number;
}

/** Roughly 170–365 points per chart: smooth enough, small enough to send. */
export const RANGE_CONFIG: Record<Range, RangeConfig> = {
  "1D": { window: DAY, interval: 5 * MINUTE },
  "1W": { window: WEEK, interval: HOUR },
  "1M": { window: 30 * DAY, interval: 4 * HOUR },
  "3M": { window: 90 * DAY, interval: DAY },
  "1Y": { window: 365 * DAY, interval: DAY },
  "5Y": { window: 5 * 365 * DAY, interval: WEEK },
};
