import type { StockStats as Stats } from "@mini-trade/contracts";
import {
  formatCompactNumber,
  formatCompactPrice,
  formatPrice,
} from "../helpers/utils";

interface StockStatsProps {
  stats: Stats | undefined;
}

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

export function StockStats({ stats }: StockStatsProps) {
  const placeholder =
    "animate-pulse rounded-md bg-bg-subtle motion-reduce:animate-none";
  const cell =
    "flex flex-col gap-1 px-4 py-3.5 leading-[normal] border-border-default sm:nth-[n+5]:border-t max-sm:nth-[n+3]:border-t";

  return (
    <section
      aria-label="Key statistics"
      className="overflow-hidden rounded-xl border border-border-default bg-bg-surface"
    >
      <dl className="grid grid-cols-4 max-sm:grid-cols-2">
        {stats
          ? rows(stats).map(({ label, value }) => (
              <div key={label} className={cell}>
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="text-[15px] font-semibold text-text-primary tabular-nums">
                  {value}
                </dd>
              </div>
            ))
          : Array.from({ length: PLACEHOLDER_CELLS }, (_, i) => (
              <div key={i} aria-hidden className={cell}>
                <span className={`h-3 w-16 ${placeholder}`} />
                <span className={`h-4 w-20 ${placeholder}`} />
              </div>
            ))}

        <div aria-hidden className={cell} />
      </dl>
    </section>
  );
}
