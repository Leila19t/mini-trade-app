import { Ticker } from "@mini-trade/contracts";
import { useParams } from "react-router";
import { NotFoundScreen } from "./NotFoundScreen";

/** One stock: live price, stats and the history chart. URL: /stocks/:symbol */
export function StockDetailScreen() {
  const parsed = Ticker.safeParse(useParams().symbol);
  // A malformed symbol can't exist; an unknown but valid one is handled once data loads.
  if (!parsed.success) return <NotFoundScreen />;
  const symbol = parsed.data;

  return (
    <main className="mx-auto max-w-page p-6">
      <h1 className="text-2xl font-bold">{symbol}</h1>
    </main>
  );
}
