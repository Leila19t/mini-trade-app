import type { StockStats as Stats } from "@mini-trade/contracts";
import { formatCompactNumber, formatCompactPrice, formatPrice } from "../helpers/utils";

interface StockStatsProps {
  /** Undefined while loading: skeleton cells. */
  stats: Stats | undefined;
}

/**
 * Key figures under the chart. The mock market trades 24/7, so the Figma
 * "Open / Day high / Day low / Prev. close" become rolling 24-hour figures:
 * there is no exchange session, so no separate open and close.
 */
function rows(stats: Stats): { label: string; value: string }[] {
  return [
    { label: "24h ago", value: formatPrice(stats.price24hAgo) },
    { label: "24h high", value: formatPrice(stats.high24h) },
    { label: "24h low", value: formatPrice(stats.low24h) },
    { label: "Volume (24h)", value: formatCompactNumber(stats.volume24h) },
    { label: "52-week high", value: formatPrice(stats.week52High) },
    { label: "52-week low", value: formatPrice(stats.week52Low) },
    { label: "Market cap", value: formatCompactPrice(stats.marketCap) },
  ];
}

const PLACEHOLDER_CELLS = 7;

/** 4 columns on desktop, 2 on phones; each new row starts with a divider (Figma "Stats"). */
export function StockStats({ stats }: StockStatsProps) {
  const placeholder = "animate-pulse rounded-md bg-bg-subtle motion-reduce:animate-none";
  const cell =
    "flex flex-col gap-1 px-4 py-3.5 leading-[normal] border-border-default sm:nth-[n+5]:border-t max-sm:nth-[n+3]:border-t";

  return (
    <section aria-label="Key statistics" className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
      <dl className="grid grid-cols-4 max-sm:grid-cols-2">
        {stats
          ? rows(stats).map(({ label, value }) => (
              <div key={label} className={cell}>
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="text-[15px] font-semibold text-text-primary tabular-nums">{value}</dd>
              </div>
            ))
          : Array.from({ length: PLACEHOLDER_CELLS }, (_, i) => (
              <div key={i} aria-hidden className={cell}>
                <span className={`h-3 w-16 ${placeholder}`} />
                <span className={`h-4 w-20 ${placeholder}`} />
              </div>
            ))}
        {/* 7 figures: one empty cell completes the last row (and its divider) in both 4 and 2 columns. */}
        <div aria-hidden className={cell} />
      </dl>
    </section>
  );
}
