import type { Candle, CandleInterval, Ticker } from "@mini-trade/contracts";
import { candleChange, formatCandleTime } from "../../helpers/candles";
import {
  directionText,
  formatCompactNumber,
  formatSignedPercent,
  formatSignedPrice,
} from "../../helpers/utils";

interface CandleLegendProps {
  symbol: Ticker;
  interval: CandleInterval;
  candle: Candle;

  live: boolean;
}

const plain = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "NVDA · 15m  Nov 26, 4:45 PM  O 131.74  H 131.95  L 131.69  C 131.88  +0.14 (+0.10%)  Vol 712K" (Figma "OHLCV legend"). */
export function CandleLegend({
  symbol,
  interval,
  candle,
  live,
}: CandleLegendProps) {
  const change = candleChange(candle);
  const tone = directionText[change.direction];
  const values: [string, number][] = [
    ["O", candle.open],
    ["H", candle.high],
    ["L", candle.low],
    ["C", candle.close],
  ];

  return (
    <div className="flex min-h-4 flex-wrap items-center gap-x-3.5 gap-y-1 text-xs leading-4 whitespace-nowrap tabular-nums">
      <span className="font-semibold text-text-primary">
        {symbol} · {interval}
      </span>
      <span className="text-text-muted">
        {formatCandleTime(candle.timestamp, interval)}
      </span>
      {values.map(([label, value]) => (
        <span key={label} className="flex gap-1">
          <span className="font-medium text-text-muted">{label}</span>
          <span className={`font-semibold ${tone}`}>{plain.format(value)}</span>
        </span>
      ))}
      <span className={`font-semibold ${tone}`}>
        {formatSignedPrice(change.amount)} (
        {formatSignedPercent(change.fraction)})
      </span>
      <span className="flex gap-1">
        <span className="font-medium text-text-muted">Vol</span>
        <span className="font-semibold text-text-primary">
          {formatCompactNumber(candle.volume)}
        </span>
      </span>
      {live && (
        <span className="flex items-center gap-1.5 font-medium text-text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-price-up" />
          Live candle
        </span>
      )}
    </div>
  );
}
