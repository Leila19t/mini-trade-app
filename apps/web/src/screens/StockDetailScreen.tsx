import { Ticker } from "@mini-trade/contracts";
import { Navigate, useLocation, useParams } from "react-router";
import alertCircle from "../assets/icons/alert-circle.svg";
import { Button } from "../components/Button";
import { EmptyState } from "../components/feedback/EmptyState";
import { HttpError } from "../data/http";
import { paths } from "../helpers/constants";
import { useStock } from "../hooks/useStock";
import { PriceChartPanel } from "../views/PriceChartPanel";
import { StockNotFound } from "../views/StockNotFound";
import { StockOverview } from "../views/StockOverview";
import { StockStats } from "../views/StockStats";
import { WatchBar } from "../views/WatchBar";

const PAGE =
  "mx-auto max-w-page px-6 pt-6 pb-12 max-sm:px-0 max-sm:pt-0 max-sm:pb-0";

/** One stock: live price, chart and stats. URL: /stocks/:symbol?range=1M */
export function StockDetailScreen() {
  const raw = useParams().symbol ?? "";
  const { search } = useLocation();

  const parsed = Ticker.safeParse(raw);
  if (parsed.success) return <StockDetail symbol={parsed.data} />;

  // Lowercase links still work: /stocks/nvda → /stocks/NVDA (the range is kept).
  const upper = Ticker.safeParse(raw.toUpperCase());
  if (upper.success) return <Navigate to={{ pathname: paths.stock(upper.data), search }} replace />;

  return <WrongSymbol symbol={raw} />;
}

/** A symbol that can't exist, or one this market doesn't have: back link and the message in the chart card. */
function WrongSymbol({ symbol }: { symbol: string }) {
  return (
    <main className={PAGE}>
      <StockNotFound symbol={symbol} />
    </main>
  );
}

function StockDetail({ symbol }: { symbol: Ticker }) {
  const stock = useStock(symbol);

  if (stock.error instanceof HttpError && stock.error.code === "NOT_FOUND") {
    return <WrongSymbol symbol={symbol} />;
  }

  if (stock.isError && !stock.data) {
    return (
      <main className={`${PAGE} max-sm:px-4 max-sm:pt-6`}>
        <EmptyState
          icon={alertCircle}
          title={`Couldn't load ${symbol}`}
          action={
            <Button variant="secondary" onClick={() => void stock.refetch()}>
              Try again
            </Button>
          }
        >
          The server didn't answer. Check your connection and try again.
        </EmptyState>
      </main>
    );
  }

  return (
    <main className={PAGE}>
      {/* On phones the top block is one white panel; on desktop the chart is a card. */}
      <div className="flex flex-col gap-5 max-sm:gap-3.5 max-sm:bg-bg-surface max-sm:px-4 max-sm:pb-4">
        <StockOverview symbol={symbol} stock={stock.data} />
        <PriceChartPanel symbol={symbol} />
      </div>
      <div className="mt-5 max-sm:mt-0 max-sm:p-4 max-sm:pb-6">
        <StockStats stats={stock.data?.stats} />
      </div>
      <WatchBar symbol={symbol} />
    </main>
  );
}
