import alertCircle from "../assets/icons/alert-circle.svg";
import { CHART_HEIGHT } from "../components/chart/EmptyGrid";
import { BackToMarkets } from "../components/navigation/BackToMarkets";

/** Longest symbol echoed back; a junk URL is cut so it can't stretch the card. */
const MAX_SHOWN = 24;

interface StockNotFoundProps {
  /** The symbol as it was in the URL. */
  symbol: string;
}

/**
 * /stocks/:symbol when the symbol isn't in this market: the Markets link where
 * it always is, and the chart card (empty) holding the message.
 */
export function StockNotFound({ symbol }: StockNotFoundProps) {
  const shown = symbol.length > MAX_SHOWN ? `${symbol.slice(0, MAX_SHOWN)}…` : symbol;

  return (
    <div className="flex flex-col gap-5 max-sm:gap-3.5 max-sm:bg-bg-surface max-sm:px-4 max-sm:pb-4">
      <nav className="flex items-center max-sm:pt-2">
        <BackToMarkets />
      </nav>

      <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5 max-sm:rounded-none max-sm:border-0 max-sm:p-0">
        <div className={`relative ${CHART_HEIGHT}`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 pb-6 text-center">
            <img src={alertCircle} alt="" width={32} height={32} />
            <h1 className="text-base leading-[normal] font-semibold text-text-primary">Wrong symbol</h1>
            <p className="max-w-80 text-sm leading-[normal] text-text-muted">
              There's no stock called <span className="font-semibold break-all text-text-secondary">{shown}</span>{" "}
              in this market. Check the spelling, or go back to Markets to pick one.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
